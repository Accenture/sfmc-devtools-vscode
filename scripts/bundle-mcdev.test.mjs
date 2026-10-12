import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { bundleMcdev } from "./bundle-mcdev.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("local source packaging never guesses a sibling or provisions a runtime", async () => {
	await assert.rejects(bundleMcdev(undefined), /MCDEV_BUNDLE_SOURCE/);
	await assert.rejects(bundleMcdev("../sfmc-devtools"), /absolute local/);
});

test("compile and production prepublish both stage the runtime", async () => {
	const manifest = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
	assert.match(manifest.scripts.compile, /npm run bundle:mcdev/);
	assert.match(manifest.scripts.package, /npm run bundle:mcdev/);
	assert.equal(manifest.scripts["vscode:prepublish"], "npm run package");
	const ignore = await fs.readFile(path.join(root, ".vscodeignore"), "utf8");
	assert.match(ignore, /^!dist\/mcdev\/\*\*$/m);
	assert.match(ignore, /^node_modules\/\*\*$/m);
});

test("staged package preserves ESM entry, licenses, boilerplate dotfiles and full formatter closure", async () => {
	const runtime = path.join(root, "dist", "mcdev");
	const metadata = JSON.parse(await fs.readFile(path.join(runtime, "bundle-metadata.json"), "utf8"));
	const manifest = JSON.parse(await fs.readFile(path.join(runtime, "package.json"), "utf8"));
	assert.equal(manifest.name, "mcdev");
	assert.equal(manifest.type, "module");
	assert.equal(metadata.cliPath, "lib/cli.js");
	assert.equal(metadata.nodeEngine, manifest.engines.node);
	assert(metadata.files["lib/cli.js"]);
	assert(Object.keys(metadata.files).some(file => /^license/i.test(file)));
	assert(Object.keys(metadata.files).some(file => /^boilerplate\/files\/\./.test(file)));
	assert(metadata.files["node_modules/prettier/package.json"]);
	assert(metadata.files["node_modules/prettier/plugins/html.mjs"]);
	assert(metadata.files["node_modules/prettier-plugin-sfmc/package.json"]);
	const lock = JSON.parse(await fs.readFile(path.join(runtime, "package-lock.json"), "utf8"));
	for (const [name, item] of Object.entries(lock.packages)) {
		if (name && !item.dev) assert(metadata.files[`${name}/package.json`], `Production closure: ${name}`);
	}
	assert(!JSON.stringify(metadata).includes(root));
});
