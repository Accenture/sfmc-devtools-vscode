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
	assert.match(ignore, /^\.mcdev-source\/\*\*$/m);
});

test("exact source CI and stage provenance fail closed without registry fallback", async () => {
	const workflow = await fs.readFile(path.join(root, ".github/workflows/code-test.yml"), "utf8");
	assert.match(workflow, /ref: aab5ee99eb53d8c468956d84547c02acf336e191/);
	assert.match(workflow, /MCDEV_BUNDLE_EXPECTED_COMMIT: aab5ee99eb53d8c468956d84547c02acf336e191/);
	assert.match(workflow, /windows-latest/);
	assert.match(workflow, /npm run verify:vsix/);
	if (!process.env.MCDEV_BUNDLE_SOURCE) return;
	const previous = process.env.MCDEV_BUNDLE_EXPECTED_COMMIT;
	try {
		process.env.MCDEV_BUNDLE_EXPECTED_COMMIT = "0000000000000000000000000000000000000000";
		await assert.rejects(bundleMcdev(process.env.MCDEV_BUNDLE_SOURCE), /expected clean immutable commit/);
	} finally {
		if (previous === undefined) delete process.env.MCDEV_BUNDLE_EXPECTED_COMMIT;
		else process.env.MCDEV_BUNDLE_EXPECTED_COMMIT = previous;
	}
});

test("cached identical bytes refresh current source provenance", async () => {
	if (!process.env.MCDEV_BUNDLE_SOURCE) return;
	const metadataPath = path.join(root, "dist", "mcdev", "bundle-metadata.json");
	const original = JSON.parse(await fs.readFile(metadataPath, "utf8"));
	try {
		await fs.writeFile(metadataPath, JSON.stringify({ ...original, sourceCommit: "stale", sourceDirty: true }));
		const refreshed = await bundleMcdev(process.env.MCDEV_BUNDLE_SOURCE);
		assert.equal(refreshed.sourceCommit, original.sourceCommit);
		assert.equal(refreshed.sourceDirty, original.sourceDirty);
		assert.deepEqual(refreshed.files, original.files);
	} finally {
		await fs.writeFile(metadataPath, `${JSON.stringify(original, null, 2)}\n`);
	}
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
