/** Stage the installed registry mcdev package and its locked production closure. */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

async function filesBelow(root, relative = "") {
	const files = [];
	for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === ".bin") continue;
		const name = path.posix.join(relative, entry.name);
		const stat = await fs.lstat(path.join(root, name));
		if (stat.isSymbolicLink()) throw new Error(`Runtime cannot contain symlinks: ${name}`);
		if (stat.isDirectory()) files.push(...(await filesBelow(root, name)));
		else if (stat.isFile()) files.push(name);
		else throw new Error(`Unsupported runtime file: ${name}`);
	}
	return files.sort();
}

async function inventory(root, relative = "") {
	const files = [];
	for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
		const name = path.posix.join(relative, entry.name);
		const stat = await fs.lstat(path.join(root, name));
		if (stat.isSymbolicLink()) throw new Error(`Output cannot contain links: ${name}`);
		if (stat.isDirectory()) files.push(...(await inventory(root, name)));
		else if (stat.isFile()) files.push(name);
		else throw new Error(`Unsupported output file: ${name}`);
	}
	return files.sort();
}

function validatePath(file) {
	if (
		!file ||
		path.isAbsolute(file) ||
		file.includes("\\") ||
		file.split("/").some(part => !part || part === ".." || part === ".")
	) {
		throw new Error(`Invalid registered runtime path: ${file}`);
	}
}

export async function bundleMcdev(destination = path.join(projectRoot, "dist", "mcdev")) {
	const lockBytes = await fs.readFile(path.join(projectRoot, "package-lock.json"));
	const lock = JSON.parse(lockBytes);
	const expected = lock.packages[""].devDependencies.mcdev;
	const rootKey = "node_modules/mcdev";
	if (expected !== "10.1.0" || lock.packages[rootKey]?.version !== expected) {
		throw new Error("Expected the exact locked mcdev 10.1.0 build dependency.");
	}
	const files = new Map();
	const packages = {};
	const visited = new Set();
	// Follow Node's actual hoisted/nested lookup, not lockfile dev flags: mcdev is a devDependency.
	async function visit(key) {
		if (visited.has(key)) return;
		visited.add(key);
		const item = lock.packages[key];
		if (!item || item.link || !item.integrity || !item.resolved?.startsWith("https:") || item.hasInstallScript) {
			throw new Error(`Runtime dependency must be registry-locked and script-free: ${key}`);
		}
		const source = path.join(projectRoot, key);
		if ((await fs.realpath(source)) !== path.resolve(source)) throw new Error(`Linked package: ${key}`);
		const manifest = JSON.parse(await fs.readFile(path.join(source, "package.json"), "utf8"));
		if (manifest.version !== item.version) throw new Error(`Installed package differs from lock: ${key}`);
		const target = key === rootKey ? "" : key.startsWith(`${rootKey}/`) ? key.slice(rootKey.length + 1) : key;
		if (packages[target || "."] && packages[target || "."].version !== item.version) {
			throw new Error(
				`Registry closure relocation collision at ${target}: ${packages[target].version} vs ${item.version}`
			);
		}
		packages[target || "."] = {
			name: manifest.name,
			version: item.version,
			resolved: item.resolved,
			integrity: item.integrity
		};
		for (const file of await filesBelow(source)) {
			const output = path.posix.join(target, file);
			validatePath(output);
			files.set(output, {
				source: path.join(source, file),
				hash: digest(await fs.readFile(path.join(source, file)))
			});
		}
		const optional = manifest.optionalDependencies || {};
		const dependencies = { ...manifest.dependencies, ...manifest.peerDependencies, ...optional };
		for (const name of Object.keys(dependencies)) {
			let parent = key;
			let selected;
			while (true) {
				const candidate = path.posix.join(parent, "node_modules", name);
				if (lock.packages[candidate]) {
					try {
						await fs.access(path.join(projectRoot, candidate, "package.json"));
						selected = candidate;
						break;
					} catch (error) {
						if (error.code !== "ENOENT") throw error;
					}
				}
				if (!parent) break;
				const index = parent.lastIndexOf("/node_modules/");
				parent = index < 0 ? "" : parent.slice(0, index);
			}
			if (selected) await visit(selected);
			else if (!(name in optional) && !manifest.peerDependenciesMeta?.[name]?.optional) {
				throw new Error(`Missing installed runtime dependency: ${key} -> ${name}`);
			}
		}
	}
	await visit(rootKey);
	const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, rootKey, "package.json"), "utf8"));
	if (manifest.name !== "mcdev" || manifest.type !== "module" || manifest.bin.mcdev !== "lib/cli.js") {
		throw new Error("Expected the mcdev ESM package with lib/cli.js as its entry.");
	}
	const hashes = Object.fromEntries(
		[...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, item]) => [file, item.hash])
	);
	const metadata = {
		schemaVersion: 2,
		source: "npm-registry",
		lockSha256: digest(lockBytes),
		name: manifest.name,
		version: manifest.version,
		nodeEngine: manifest.engines.node,
		cliPath: "lib/cli.js",
		packages,
		files: hashes
	};
	destination = path.resolve(destination);
	for (let current = destination; current !== path.dirname(current); current = path.dirname(current)) {
		try {
			if ((await fs.lstat(current)).isSymbolicLink())
				throw new Error(`Output cannot traverse a link: ${current}`);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	const metadataPath = path.join(destination, "bundle-metadata.json");
	let previous;
	try {
		previous = JSON.parse(await fs.readFile(metadataPath, "utf8"));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	for (const file of Object.keys(previous?.files || {})) validatePath(file);
	try {
		for (const file of await inventory(destination)) {
			if (file !== "bundle-metadata.json" && !previous?.files[file])
				throw new Error(`Unregistered staged file: ${file}`);
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	for (const [file, item] of files) {
		const content = await fs.readFile(item.source);
		if (digest(content) !== item.hash) throw new Error(`Installed runtime changed during packaging: ${file}`);
		await fs.mkdir(path.dirname(path.join(destination, file)), { recursive: true });
		await fs.writeFile(path.join(destination, file), content);
	}
	for (const file of Object.keys(previous?.files || {})) {
		if (!files.has(file)) await fs.unlink(path.join(destination, file));
	}
	if (digest(await fs.readFile(path.join(projectRoot, "package-lock.json"))) !== metadata.lockSha256) {
		throw new Error("Dependency lock changed during packaging.");
	}
	await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
	console.log(`mcdev ${metadata.version} staged (${files.size} files, ${visited.size} packages)`);
	return metadata;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await bundleMcdev();
