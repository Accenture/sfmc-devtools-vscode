import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = path.join(root, "dist", "mcdev");

test("exact registry build dependency and optional external CLI peer coexist", async () => {
	const manifest = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
	assert.equal(manifest.devDependencies.mcdev, "10.1.0");
	assert.equal(manifest.devDependencies.prettier, "3.9.9");
	const lock = JSON.parse(await fs.readFile(path.join(root, "package-lock.json"), "utf8"));
	assert.equal(lock.packages["node_modules/mcdev"].dependencies.prettier, manifest.devDependencies.prettier);
	assert.equal(lock.packages["node_modules/prettier"].version, manifest.devDependencies.prettier);
	assert.equal(lock.packages["node_modules/mcdev/node_modules/prettier"], undefined);
	assert.equal(manifest.peerDependencies.mcdev, ">=9.0.0");
	assert.equal(manifest.peerDependenciesMeta.mcdev.optional, true);
	assert.match(manifest.scripts.compile, /npm run bundle:mcdev/);
	assert.match(manifest.scripts.package, /npm run bundle:mcdev/);
	assert.equal(manifest.scripts["vscode:prepublish"], "npm run package");
	const ignore = await fs.readFile(path.join(root, ".vscodeignore"), "utf8");
	assert.match(ignore, /^!dist\/mcdev\/\*\*$/m);
	assert.match(ignore, /^node_modules\/\*\*$/m);
});

test("CI stages registry runtime before packaging-dependent tests", async () => {
	for (const name of ["code-test.yml", "vsce-publish.yml"]) {
		const workflow = await fs.readFile(path.join(root, ".github/workflows", name), "utf8");
		assert(!workflow.includes("MCDEV_BUNDLE_SOURCE"));
		assert(!workflow.includes("MCDEV_BUNDLE_EXPECTED_COMMIT"));
		assert(workflow.indexOf("npm run compile") < workflow.indexOf("npm test"));
	}
});

test("staged registry closure preserves resources, versions and installed resolutions", async () => {
	const lock = JSON.parse(await fs.readFile(path.join(root, "package-lock.json"), "utf8"));
	const metadata = JSON.parse(await fs.readFile(path.join(runtime, "bundle-metadata.json"), "utf8"));
	const manifest = JSON.parse(await fs.readFile(path.join(runtime, "package.json"), "utf8"));
	assert.equal(metadata.schemaVersion, 2);
	assert.equal(metadata.source, "npm-registry");
	assert.equal(metadata.version, "10.1.0");
	assert.equal(manifest.type, "module");
	assert.equal(metadata.cliPath, "lib/cli.js");
	assert.equal(metadata.nodeEngine, "^22.22.2 || >=24.15.0");
	assert.equal(metadata.nodeEngine, manifest.engines.node);
	assert.equal(
		metadata.lockSha256,
		createHash("sha256")
			.update(await fs.readFile(path.join(root, "package-lock.json")))
			.digest("hex")
	);
	assert(metadata.files["lib/cli.js"]);
	assert(Object.keys(metadata.files).some(file => /^license/i.test(file)));
	assert(Object.keys(metadata.files).some(file => /^boilerplate\/files\/\./.test(file)));
	assert(metadata.files["node_modules/prettier/plugins/html.mjs"]);
	assert(metadata.files["node_modules/prettier-plugin-sfmc/package.json"]);
	assert.equal(metadata.packages["node_modules/sfmc-sdk"].version, "4.0.2");
	assert.equal(metadata.packages["node_modules/prettier"].version, manifest.dependencies.prettier);
	const mcdevRequire = createRequire(path.join(runtime, "package.json"));
	const pluginRequire = createRequire(path.join(runtime, "node_modules/prettier-plugin-sfmc/package.json"));
	assert.equal(mcdevRequire("prettier/package.json").version, "3.9.9");
	assert.equal(pluginRequire("prettier/package.json").version, "3.9.9");
	assert.equal(mcdevRequire.resolve("prettier"), pluginRequire.resolve("prettier"));
	assert.deepEqual(
		Object.values(metadata.packages)
			.filter(item => item.name === "prettier")
			.map(item => item.version),
		["3.9.9"]
	);
	assert(!metadata.packages["node_modules/typescript"]);
	assert(!metadata.packages["node_modules/@vscode/vsce"]);
	for (const [directory, item] of Object.entries(metadata.packages)) {
		assert(item.resolved.startsWith("https://registry.npmjs.org/"));
		assert(item.integrity);
		const installed = JSON.parse(await fs.readFile(path.join(runtime, directory, "package.json"), "utf8"));
		assert.equal(installed.version, item.version);
		const sourceKey =
			directory === "."
				? "node_modules/mcdev"
				: lock.packages[`node_modules/mcdev/${directory}`]
					? `node_modules/mcdev/${directory}`
					: directory;
		assert.equal(lock.packages[sourceKey].integrity, item.integrity, `${directory} must match its locked source`);
		for (const dependency of Object.keys({ ...installed.dependencies, ...installed.peerDependencies })) {
			if (
				dependency in (installed.optionalDependencies || {}) ||
				installed.peerDependenciesMeta?.[dependency]?.optional
			)
				continue;
			// Include declaration-only packages: they have no executable require.resolve entry.
			let parent = directory === "." ? "" : directory;
			while (!metadata.packages[path.posix.join(parent, "node_modules", dependency)]) {
				assert(parent, `${item.name} -> ${dependency} missing from packaged closure`);
				const index = parent.lastIndexOf("/node_modules/");
				parent = index < 0 ? "" : parent.slice(0, index);
			}
			const staged = metadata.packages[path.posix.join(parent, "node_modules", dependency)];
			let sourceParent = sourceKey;
			while (!lock.packages[path.posix.join(sourceParent, "node_modules", dependency)]) {
				assert(sourceParent, `${item.name} -> ${dependency} missing from lock`);
				const index = sourceParent.lastIndexOf("/node_modules/");
				sourceParent = index < 0 ? "" : sourceParent.slice(0, index);
			}
			const expected = lock.packages[path.posix.join(sourceParent, "node_modules", dependency)];
			assert.equal(staged.version, expected.version, `${directory} -> ${dependency} version changed`);
			assert.equal(staged.integrity, expected.integrity, `${directory} -> ${dependency} identity changed`);
		}
	}
	assert(!JSON.stringify(metadata).includes(root));
});
