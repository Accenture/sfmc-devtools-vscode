import * as assert from "assert";
import StandardCommands from "../../../devtools/commands/standard";
import { TDevTools } from "@types";

function makeDeployParams(opts?: { topFolder?: string; keys?: string[] }): TDevTools.ICommandFileParameters {
	const topFolder = opts?.topFolder ?? "/deploy/";
	const keys = opts?.keys ?? ["key1"];
	const metadata: TDevTools.IMetadataCommand[] = keys.map(key => ({
		metadatatype: "dataExtension",
		key,
		path: `${topFolder}cred/bu/dataExtension`
	}));
	return { credential: "cred/bu", projectPath: "/project", topFolder, metadata };
}

suite("StandardCommands – deploy", () => {
	let cmd: StandardCommands;
	setup(() => {
		cmd = new StandardCommands();
	});

	test("deploy returns alias 'd'", () => {
		const result = cmd.deploy({ files: [makeDeployParams()] });
		assert.strictEqual(result.alias, "d");
	});

	test("deploy throws when 'files' property is missing", () => {
		assert.throws(() => cmd.deploy({}), /\[standard_deploy\]/);
	});

	test("deploy from retrieve folder adds --fromRetrieve flag", () => {
		const param = makeDeployParams({ topFolder: "/retrieve/", keys: ["key1"] });
		const result = cmd.deploy({ files: [param] });
		assert.ok(result.config[0][0].includes("--fromRetrieve"));
	});

	test("deploy from retrieve folder filters out empty keys", () => {
		const param = makeDeployParams({ topFolder: "/retrieve/", keys: ["", "key1"] });
		const result = cmd.deploy({ files: [param] });
		const paramStr = result.config[0][0];
		assert.ok(!paramStr.includes('-m dataExtension:""'));
	});

	test("deploy from retrieve folder with only empty keys produces no config", () => {
		const param = makeDeployParams({ topFolder: "/retrieve/", keys: [""] });
		const result = cmd.deploy({ files: [param] });
		assert.strictEqual(result.config.length, 0);
	});

	test("deploy from deploy folder does not add --fromRetrieve", () => {
		const param = makeDeployParams({ topFolder: "/deploy/" });
		const result = cmd.deploy({ files: [param] });
		assert.ok(!result.config[0][0].includes("--fromRetrieve"));
	});

	test("deploy handles multiple credentials", () => {
		const param1 = makeDeployParams();
		const param2: TDevTools.ICommandFileParameters = {
			credential: "cred2/bu2",
			projectPath: "/project2",
			topFolder: "/deploy/",
			metadata: [{ metadatatype: "query", key: "q1", path: "/deploy/cred2/bu2/query" }]
		};
		const result = cmd.deploy({ files: [param1, param2] });
		assert.strictEqual(result.config.length, 2);
	});
});
