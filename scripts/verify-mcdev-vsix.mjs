/** Verify the actual packaged runtime after extracting it outside the checkout. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire, Module } from "node:module";
import { build } from "esbuild";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";

// Use the ZIP reader already owned by the pinned VSIX packaging tool.
const require = createRequire(import.meta.url);
const vsceRequire = createRequire(require.resolve("@vscode/vsce"));
const yauzl = vsceRequire("yauzl");

export async function verifyVsix(vsix) {
	const runRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcdev-vsix-"));
	await fs.writeFile(path.join(runRoot, ".owner"), createHash("sha256").update(runRoot).digest("hex"));
	const extensionRoot = path.join(runRoot, "extension with spaces");
	const extraction = path.join(extensionRoot, "dist", "mcdev");
	await fs.mkdir(extraction, { recursive: true });
	let count = 0;
	await new Promise((resolve, reject) => {
		yauzl.open(vsix, { lazyEntries: true }, (error, zip) => {
			if (error) return reject(error);
			zip.on("error", reject);
			zip.on("end", resolve);
			zip.on("entry", async entry => {
				try {
					assert(!entry.fileName.startsWith("extension/node_modules/"), "Build dependencies must not ship");
					if (entry.fileName === "extension/dist/extension.bundle.js") {
						const stream = await new Promise((accept, fail) =>
							zip.openReadStream(entry, (err, input) => (err ? fail(err) : accept(input)))
						);
						await pipeline(
							stream,
							createWriteStream(path.join(extensionRoot, "dist", "extension.bundle.js"), { flags: "wx" })
						);
						zip.readEntry();
						return;
					}
					const prefix = "extension/dist/mcdev/";
					if (!entry.fileName.startsWith(prefix) || entry.fileName.endsWith("/")) {
						zip.readEntry();
						return;
					}
					const relative = entry.fileName.slice(prefix.length);
					assert(!path.isAbsolute(relative) && !relative.split("/").includes(".."));
					assert.notEqual((entry.externalFileAttributes >>> 16) & 0o170000, 0o120000, "No archive symlinks");
					const output = path.join(extraction, relative);
					await fs.mkdir(path.dirname(output), { recursive: true });
					const stream = await new Promise((accept, fail) =>
						zip.openReadStream(entry, (err, input) => (err ? fail(err) : accept(input)))
					);
					await pipeline(stream, createWriteStream(output, { flags: "wx" }));
					count++;
					zip.readEntry();
				} catch (err) {
					zip.close();
					reject(err);
				}
			});
			zip.readEntry();
		});
	});
	const metadata = JSON.parse(await fs.readFile(path.join(extraction, "bundle-metadata.json"), "utf8"));
	for (const [file, hash] of Object.entries(metadata.files)) {
		const content = await fs.readFile(path.join(extraction, file));
		assert.equal(createHash("sha256").update(content).digest("hex"), hash, `VSIX preserved ${file}`);
	}
	assert.equal(count, Object.keys(metadata.files).length + 1);
	const cwd = path.join(runRoot, "empty project");
	await fs.mkdir(cwd);
	// Load the actual minified extension with only the VS Code API mocked. Its default
	// version lookup must traverse resolveRuntime and the real PATH Node version probe.
	const mockFile = path.join(runRoot, "vscode-mock.cjs");
	await build({
		entryPoints: [path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/test/mock/vscode.ts")],
		outfile: mockFile,
		bundle: true,
		platform: "node",
		format: "cjs"
	});
	const vscode = require(mockFile);
	vscode.env.isTelemetryEnabled = false;
	let resource;
	vscode.workspace.getConfiguration = (_section, uri) => {
		if (uri) resource = uri;
		return { get: (key, fallback) => (key === "mcdevSource" ? "bundled" : fallback) };
	};
	const load = Module._load;
	let extension;
	try {
		Module._load = function (id, ...args) {
			return id === "vscode" ? vscode : load.call(this, id, ...args);
		};
		extension = require(path.join(extensionRoot, "dist", "extension.bundle.js"));
	} finally {
		Module._load = load;
	}
	for (const input of process.platform === "win32" ? [cwd, vscode.Uri.file(cwd).path] : [cwd]) {
		// Supply both forms at the runtime boundary; don't normalize in the test caller.
		vscode.workspace.workspaceFolders = [{ uri: { path: input, fsPath: input } }];
		let finish;
		const observed = new Promise(resolve => {
			finish = resolve;
		});
		await extension.activate(
			{
				subscriptions: [],
				globalState: { setKeysForSync: () => {}, get: () => "3.5.0", update: async () => {} },
				extensionUri: vscode.Uri.file(extensionRoot),
				extension: { id: "test", packageJSON: { name: "sfmc-devtools-vscode", version: "3.5.0" } }
			},
			{
				createReporter: () => ({
					track: (event, props) => {
						if (event === "mcdev.version") finish(props);
					},
					disposeAsync: async () => {}
				})
			}
		);
		const timer = setTimeout(() => finish({}), 30000);
		const props = await observed;
		clearTimeout(timer);
		assert.equal(props.mcdevVersion, metadata.version, `Packaged real resolver failed for ${input}`);
		assert.equal(resource.fsPath, vscode.Uri.file(cwd).fsPath);
		await extension.deactivate();
	}
	console.log("Packaged extension default resolver and PATH Node probe passed for native/URI project roots");
	// No external mcdev, Git or npm is available; only this absolute Node executable.
	const env = { ...process.env, PATH: "", NODE_PATH: "", MCDEV_RUNTIME_SOURCE: "bundled" };
	assert.equal(metadata.schemaVersion, 2);
	assert.equal(metadata.source, "npm-registry");
	assert.equal(metadata.version, "10.1.0");
	assert.equal(metadata.nodeEngine, "^22.22.2 || >=24.15.0");
	assert.equal(metadata.packages["node_modules/sfmc-sdk"].version, "4.0.2");
	assert.equal(
		metadata.lockSha256,
		createHash("sha256")
			.update(await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "../package-lock.json")))
			.digest("hex")
	);
	for (const args of [["--version"], ["--help"], ["et", "--json"]]) {
		const result = spawnSync(process.execPath, [path.join(extraction, metadata.cliPath), ...args], {
			cwd,
			env,
			encoding: "utf8",
			timeout: 30000
		});
		assert.equal(result.status, 0, `${args.join(" ")}: ${result.error || result.stderr}`);
		if (args[0] === "--version") assert.match(result.stdout, new RegExp(metadata.version.replaceAll(".", "\\.")));
		if (args[0] === "--help") assert.match(result.stdout, /mcdev/i);
		if (args[0] === "et") assert(Object.keys(JSON.parse(result.stdout)).length > 0);
	}
	const smoke = spawnSync(
		process.execPath,
		[path.join(path.dirname(fileURLToPath(import.meta.url)), "smoke-mcdev-runtime.mjs"), extraction],
		{
			cwd,
			env,
			encoding: "utf8",
			timeout: 120000
		}
	);
	assert.equal(smoke.status, 0, `Packaged workflows: ${smoke.error || smoke.stdout + smoke.stderr}`);
	console.log(smoke.stdout);
	console.log(`Verified ${count} VSIX runtime files; relocated --version/help/et --json passed: ${runRoot}`);
	return { count, metadata, runRoot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	if (!process.argv[2]) throw new Error("Usage: npm run verify:vsix -- <absolute VSIX path>");
	await verifyVsix(path.resolve(process.argv[2]));
}
