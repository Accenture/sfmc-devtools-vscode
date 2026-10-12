/** Offline acceptance against a relocated packaged runtime, never the source checkout. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mock } from "node:test";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

const runtime = process.argv[2];
const load = relative => import(pathToFileURL(path.join(runtime, relative)).href);
const { default: Mcdev } = await load("lib/index.js");
const { default: File } = await load("lib/util/file.js");
const { default: config } = await load("lib/util/config.js");
const { default: InitConfig } = await load("lib/util/init.config.js");
const { default: InitGit, isGitInstalled } = await load("lib/util/init.git.js");
const { default: Init } = await load("lib/util/init.js");
const { default: Cli } = await load("lib/util/cli.js");
const { default: DevOps } = await load("lib/util/devops.js");
const { default: Builder } = await load("lib/Builder.js");
const { Util } = await load("lib/util/util.js");
const { default: validation } = await load("lib/util/validations.js");

// Generate every template, including hidden tooling files, without invoking setup/Git/npm.
assert.equal(await InitConfig.createIdeConfigFiles("10.0.0"), true);
for (const name of Object.keys(
	JSON.parse(await fs.readFile(path.join(runtime, "bundle-metadata.json"), "utf8")).files
)) {
	if (name.startsWith("boilerplate/files/")) {
		assert.equal(
			await fs.readFile(name.slice("boilerplate/files/".length), "utf8"),
			await fs.readFile(path.join(runtime, name), "utf8"),
			name
		);
	}
}
for (const [name, template] of [
	[".gitignore", "gitignore-template"],
	[".npmrc", "npmrc-template"]
]) {
	assert.equal(
		await fs.readFile(name, "utf8"),
		await fs.readFile(path.join(runtime, "boilerplate", template), "utf8")
	);
}

// Exercise actual parser/printer outputs with project config and canonical plugin resolution.
config.properties = { options: { formatOnSave: true, formatErrorLog: false } };
await fs.writeFile("package.json", '{"type":"module"}\n');
await fs.writeFile(
	".prettierrc",
	JSON.stringify({ plugins: ["prettier-plugin-sfmc"], singleQuote: true, tabWidth: 2, sqlKeywordCase: "lower" })
);
const samples = [
	["amp", "%%[set @x=1]%%", /set @x = 1/],
	["html", '<div>%%[set @x=1]%%<script runat="server">var x={a:1};</script></div>', /var x = \{ a: 1 \};/],
	["hbs", "<div>{{  firstName  }}</div>", /\{\{firstName\}\}/],
	["sql", "SELECT A,B FROM T WHERE A=1", /select[\s\S]*from/],
	["ssjs", 'var x={text:"value"};', /var x = \{ text: 'value' \};/],
	["js", "var x={a:1};", /var x = \{ a: 1 \};/],
	["jsonc", '{// keep\n"a":true}', /\/\/ keep[\s\S]*"a": true/]
];
for (const [type, input, expected] of samples)
	assert.match(await File._beautify_prettier("", "sample", type, input), expected, type);
assert.equal(await File._beautify_prettier("", "sample", "xml", "<root/>"), "<root/>");
await fs.writeFile(
	"custom-plugin.mjs",
	'export default {parsers:{custom:{parse:text=>({text}),astFormat:"custom",locStart:()=>0,locEnd:()=>0}},printers:{custom:{print:p=>"CUSTOM:"+p.getValue().text}}};\n'
);
await fs.writeFile(
	".prettierrc",
	JSON.stringify({
		plugins: [path.resolve("custom-plugin.mjs"), "prettier-plugin-sfmc"],
		overrides: [{ files: "*.ssjs", options: { parser: "custom" } }]
	})
);
File.prettierConfigCache.clear();
assert.equal(await File._beautify_prettier("", "sample", "ssjs", "hello"), "CUSTOM:hello");
await fs.writeFile(
	".mcdev-validations.js",
	"export async function validation(){return {packaged:{passed:()=>true}};}\n"
);
assert.equal(
	(
		await validation({ type: "asset", keyField: "key", nameField: "name" }, { key: "x" }, "", [], process.cwd())
	).packaged.passed(),
	true
);

// SDK remains entirely mocked: a packaged query retrieve normalizes a real SDK-shaped response.
const { default: Query } = await load("lib/metadataTypes/Query.js");
Query.client = {
	soap: {
		retrieve: async (type, fields, options) => {
			assert.equal(type, "QueryDefinition");
			assert.deepEqual(fields, ["ObjectID"]);
			assert.equal(options.filter.leftOperand.rightOperand, "example");
			return { Results: [{ ObjectID: "mock-object-id" }] };
		}
	}
};
assert.equal(await Query._getObjectIdForSingleRetrieve("example"), "mock-object-id");
assert.equal(typeof Mcdev.retrieve, "function");

// Reenter the actual packaged CLI using the upstream helper, even with no PATH launcher.
const originalExecFile = childProcess.execFileSync;
const reentry = mock.method(childProcess, "execFileSync", (executable, args, options) => {
	assert.equal(executable, process.execPath);
	assert.equal(args[0], path.join(runtime, "lib/cli.js"));
	assert.deepEqual(args.slice(1), ["--version"]);
	assert.equal(options.stdio, "inherit");
	assert.equal(process.env.MCDEV_RUNTIME_SOURCE, "bundled");
	return originalExecFile(executable, args, options);
});
syncBuiltinESMExports();
Util.execMcdev(["--version"]);
assert.equal(reentry.mock.callCount(), 1);
mock.restoreAll();
syncBuiltinESMExports();

// Fail closed against all setup subprocesses and commits. Simulate only Git availability.
const spawn = mock.method(childProcess, "spawnSync", () => ({ error: new Error("ENOENT"), status: null }));
syncBuiltinESMExports();
mock.method(Util, "execSync", () => assert.fail("unexpected subprocess"));
mock.method(InitGit, "gitPush", () => assert.fail("unexpected push"));
mock.method(InitGit, "_updateGitConfigUser", () => assert.fail("unexpected Git config"));
mock.method(InitGit, "_addGitRemote", () => assert.fail("unexpected Git remote"));
assert.deepEqual(await InitGit.initGitRepo(), { status: "unavailable", repoName: null });
const calls = [];
mock.method(Init, "_checkPathForCloud", async () => true);
mock.method(File, "pathExists", async () => false);
mock.method(Init, "upgradeProject", async () => {
	calls.push("tooling");
	return true;
});
mock.method(Cli, "initMcdevConfig", async () => {
	calls.push("credentials");
	return true;
});
mock.method(Init, "_initMarkets", async () => {
	calls.push("markets");
});
mock.method(Init, "_downloadAllBUs", async () => {
	calls.push("retrieval");
});
await Init.initProject(null);
assert.deepEqual(calls, ["tooling", "credentials", "markets", "retrieval"]);
mock.method(config, "getProperties", async () => ({ options: {}, credentials: {} }));
assert.equal(await Mcdev.upgrade(), true);
mock.method(Builder, "purgeDeployFolderList", () => assert.fail("unexpected purge"));
await assert.rejects(DevOps.buildDeltaDefinitions({}, "main"), /requires Git.*PATH/);
await assert.rejects(Init.joinProject(), /requires Git.*PATH/);
spawn.mock.mockImplementation(() => ({ status: 0 }));
syncBuiltinESMExports();
assert.equal(isGitInstalled(), true);
mock.restoreAll();
syncBuiltinESMExports();
console.log(
	"Packaged resources, actual formatter outputs/config/plugins, external validations and mocked workflows passed"
);
