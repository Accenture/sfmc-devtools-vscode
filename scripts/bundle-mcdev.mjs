/** Stage a normal ESM mcdev package and its locked production dependencies. */
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd) {
	const result = spawnSync(command, args, { cwd, encoding: "utf8", shell: false });
	if (result.error || result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr}`);
	}
	return result.stdout;
}

// npm's JavaScript entry avoids Windows .cmd shell quoting and requires no provisioning.
function npm(args, cwd) {
	const npmCli = process.env.npm_execpath;
	if (!npmCli || !path.isAbsolute(npmCli)) {
		throw new Error("Run this build through npm (npm run bundle:mcdev).");
	}
	return run(process.execPath, [npmCli, ...args, "--no-workspaces"], cwd);
}

async function filesBelow(root, relative = "") {
	const files = [];
	for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
		if (entry.name === ".bin") continue;
		const name = path.posix.join(relative, entry.name);
		const stat = await fs.lstat(path.join(root, name));
		if (stat.isSymbolicLink()) throw new Error(`Runtime cannot contain symlinks: ${name}`);
		if (stat.isDirectory()) files.push(...(await filesBelow(root, name)));
		else if (stat.isFile()) files.push(name);
		else throw new Error(`Unsupported runtime file: ${name}`);
	}
	return files.sort();
}

async function snapshot(source) {
	const manifest = JSON.parse(await fs.readFile(path.join(source, "package.json"), "utf8"));
	if (manifest.name !== "mcdev" || manifest.type !== "module" || manifest.bin.mcdev !== "lib/cli.js") {
		throw new Error("Expected the mcdev ESM package with lib/cli.js as its entry.");
	}
	const lock = JSON.parse(await fs.readFile(path.join(source, "package-lock.json"), "utf8"));
	if (lock.name !== "mcdev" || lock.lockfileVersion < 2) throw new Error("Expected a current mcdev lockfile.");
	for (const [name, item] of Object.entries(lock.packages)) {
		if (!name || item.dev) continue;
		if (item.link || !item.integrity || !item.resolved?.startsWith("https:") || item.hasInstallScript) {
			throw new Error(`Production dependency must be registry-locked and script-free: ${name}`);
		}
	}
	const [packed] = JSON.parse(npm(["pack", "--dry-run", "--json", "--ignore-scripts"], source));
	// npm's pack inventory can exclude special dotfiles; preserve the complete boilerplate separately.
	const files = [
		...new Set([
			...packed.files.map(file => file.path),
			...(await filesBelow(path.join(source, "boilerplate"))).map(file => `boilerplate/${file}`),
			"package-lock.json"
		])
	].sort();
	const digest = createHash("sha256");
	for (const file of files) {
		if (path.isAbsolute(file) || file.split("/").includes("..")) throw new Error(`Invalid package path: ${file}`);
		const fullPath = path.join(source, file);
		if (!(await fs.lstat(fullPath)).isFile()) throw new Error(`Expected regular package file: ${file}`);
		digest
			.update(file)
			.update("\0")
			.update(await fs.readFile(fullPath))
			.update("\0");
	}
	return { manifest, files, sha256: digest.digest("hex") };
}

export async function bundleMcdev(source, destination = path.join(projectRoot, "dist", "mcdev")) {
	if (!source || !path.isAbsolute(source)) {
		throw new Error(
			"Set MCDEV_BUNDLE_SOURCE to an absolute local mcdev source checkout with package-lock.json. No implicit sibling fallback."
		);
	}
	source = await fs.realpath(source);
	destination = path.resolve(destination);
	for (let current = destination; current !== path.dirname(current); current = path.dirname(current)) {
		try {
			if ((await fs.lstat(current)).isSymbolicLink())
				throw new Error(`Output cannot traverse a link: ${current}`);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	const initial = await snapshot(source);
	const metadataPath = path.join(destination, "bundle-metadata.json");
	let previous;
	try {
		previous = JSON.parse(await fs.readFile(metadataPath, "utf8"));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (previous) {
		for (const file of Object.keys(previous.files)) {
			if (path.isAbsolute(file) || file.includes("\\") || file.split("/").includes("..")) {
				throw new Error(`Invalid registered runtime path: ${file}`);
			}
		}
	}
	if (previous?.sourceSha256 === initial.sha256) {
		const existing = await filesBelow(destination);
		if (existing.length !== Object.keys(previous.files).length + 1)
			throw new Error("Staged runtime file inventory changed.");
		// Do not trust a partial or manually changed stage just because its metadata survived.
		for (const [file, sha256] of Object.entries(previous.files)) {
			const content = await fs.readFile(path.join(destination, file));
			if (createHash("sha256").update(content).digest("hex") !== sha256) {
				throw new Error(`Staged runtime changed: ${file}`);
			}
		}
		return previous;
	}
	// Fresh builds live under an owned OS-temp run root. No recursive repository cleanup.
	const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "mcdev-bundle-"));
	const ownership = randomUUID();
	await fs.writeFile(path.join(temporary, ".owner"), ownership);
	const runtime = path.join(temporary, "runtime");
	await fs.mkdir(runtime);
	for (const file of initial.files) {
		await fs.mkdir(path.dirname(path.join(runtime, file)), { recursive: true });
		await fs.copyFile(path.join(source, file), path.join(runtime, file));
	}
	npm(["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], runtime);
	const final = await snapshot(source);
	if (final.sha256 !== initial.sha256)
		throw new Error("mcdev source changed during packaging; retry after its worker handoff.");
	const runtimeFiles = await filesBelow(runtime);
	const hashes = {};
	for (const file of runtimeFiles) {
		hashes[file] = createHash("sha256")
			.update(await fs.readFile(path.join(runtime, file)))
			.digest("hex");
	}
	// Refuse unowned output; overwrite registered files individually, never recursively remove directories.
	try {
		const existing = await filesBelow(destination);
		if (!previous && existing.length) throw new Error("Existing mcdev output has no ownership manifest.");
		for (const file of existing) {
			if (file !== "bundle-metadata.json" && !previous?.files[file])
				throw new Error(`Unregistered staged file: ${file}`);
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	for (const file of runtimeFiles) {
		await fs.mkdir(path.dirname(path.join(destination, file)), { recursive: true });
		await fs.copyFile(path.join(runtime, file), path.join(destination, file));
	}
	for (const file of Object.keys(previous?.files || {})) {
		if (!hashes[file]) await fs.unlink(path.join(destination, file));
	}
	const gitCommit = run("git", ["rev-parse", "HEAD"], source).trim();
	const gitDirty = Boolean(run("git", ["status", "--porcelain"], source).trim());
	const metadata = {
		schemaVersion: 1,
		source: "explicit-local-checkout",
		sourceCommit: gitCommit,
		sourceDirty: gitDirty,
		sourceSha256: initial.sha256,
		name: initial.manifest.name,
		version: initial.manifest.version,
		nodeEngine: initial.manifest.engines.node,
		cliPath: "lib/cli.js",
		files: hashes
	};
	await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
	// Retain isolated build fixtures rather than risk unsafe recursive cleanup.
	console.log(`mcdev ${metadata.version} staged (${runtimeFiles.length} files); isolated build: ${temporary}`);
	return metadata;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await bundleMcdev(process.env.MCDEV_BUNDLE_SOURCE);
}
