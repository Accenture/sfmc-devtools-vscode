/** Verify the actual packaged runtime after extracting it outside the checkout. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
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
	const extraction = path.join(runRoot, "extension with spaces");
	await fs.mkdir(extraction);
	let count = 0;
	await new Promise((resolve, reject) => {
		yauzl.open(vsix, { lazyEntries: true }, (error, zip) => {
			if (error) return reject(error);
			zip.on("error", reject);
			zip.on("end", resolve);
			zip.on("entry", async entry => {
				try {
					assert(!entry.fileName.startsWith("extension/node_modules/"), "Build dependencies must not ship");
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
	// No external mcdev, Git or npm is available; only this absolute Node executable.
	const env = { ...process.env, PATH: "", NODE_PATH: "" };
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
	console.log(`Verified ${count} VSIX runtime files; relocated --version/help/et --json passed: ${runRoot}`);
	return { count, metadata, runRoot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	if (!process.argv[2]) throw new Error("Usage: npm run verify:vsix -- <absolute VSIX path>");
	await verifyVsix(path.resolve(process.argv[2]));
}
