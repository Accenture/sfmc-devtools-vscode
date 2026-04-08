import * as assert from "assert";
import TemplatingCommands from "../../../devtools/commands/templating";
import { TDevTools } from "@types";

function makeCloneParams(): { files: TDevTools.ICommandFileParameters[]; targetBusinessUnit: string } {
	return {
		files: [
			{
				credential: "cred/bu",
				projectPath: "/project",
				topFolder: "/retrieve/",
				metadata: [{ metadatatype: "dataExtension", key: "myDE", path: "/retrieve/cred/bu/dataExtension" }]
			}
		],
		targetBusinessUnit: "cred/targetBU"
	};
}

suite("TemplatingCommands – clone", () => {
	let cmd: TemplatingCommands;
	setup(() => {
		cmd = new TemplatingCommands();
	});

	test("commandsList includes clone", () => {
		assert.ok(cmd.commandsList().includes("clone"));
	});

	test("clone returns alias 'clone'", () => {
		const result = cmd.clone(makeCloneParams());
		assert.strictEqual(result.alias, "clone");
	});

	test("clone includes --bf and --bt flags", () => {
		const result = cmd.clone(makeCloneParams());
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--bf"));
		assert.ok(paramStr.includes("--bt"));
	});

	test("clone includes --no-purge and --skipValidation", () => {
		const result = cmd.clone(makeCloneParams());
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--no-purge"));
		assert.ok(paramStr.includes("--skipValidation"));
	});

	test("clone includes target business unit", () => {
		const result = cmd.clone(makeCloneParams());
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("cred/targetBU"));
	});

	test("clone throws when 'files' is missing", () => {
		assert.throws(() => cmd.clone({ targetBusinessUnit: "cred/bu" }), /\[templating_clone\]/);
	});

	test("clone throws when 'targetBusinessUnit' is missing", () => {
		assert.throws(() => cmd.clone({ files: [makeCloneParams().files[0]] }), /\[templating_clone\]/);
	});

	test("run dispatches to clone", () => {
		const result = cmd.run("clone", makeCloneParams());
		assert.strictEqual(result.alias, "clone");
	});
});

function makeBuildParams(purge?: boolean): TDevTools.ICommandParameters {
	const base = {
		files: [
			{
				credential: "",
				projectPath: "/project",
				topFolder: "/retrieve/",
				metadata: [{ metadatatype: "dataExtension", key: "myDE", path: "/retrieve/cred/bu/dataExtension" }]
			}
		],
		buFrom: "srcCred/srcBU",
		buTo: "tgtCred/tgtBU",
		marketFrom: "sourceMarket",
		marketTo: "targetMarket"
	};
	return purge === undefined ? base : { ...base, purge };
}

suite("TemplatingCommands – build", () => {
	let cmd: TemplatingCommands;
	setup(() => {
		cmd = new TemplatingCommands();
	});

	test("commandsList includes build", () => {
		assert.ok(cmd.commandsList().includes("build"));
	});

	test("build with purge true includes --purge", () => {
		const result = cmd.build(makeBuildParams(true));
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--purge"));
		assert.ok(!paramStr.includes("--no-purge"));
	});

	test("build with purge false includes --no-purge", () => {
		const result = cmd.build(makeBuildParams(false));
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--no-purge"));
		assert.ok(!/\s--purge(\s|$)/.test(paramStr));
	});

	test("build without purge defaults to --no-purge", () => {
		const result = cmd.build(makeBuildParams());
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--no-purge"));
	});

	test("build returns alias build", () => {
		const result = cmd.build(makeBuildParams(false));
		assert.strictEqual(result.alias, "build");
	});

	test("run dispatches to build", () => {
		const result = cmd.run("build", makeBuildParams(true));
		assert.strictEqual(result.alias, "build");
	});

	test("build throws when required properties missing", () => {
		assert.throws(() => cmd.build({ files: [] }), /\[templating_build\]/);
	});
});
