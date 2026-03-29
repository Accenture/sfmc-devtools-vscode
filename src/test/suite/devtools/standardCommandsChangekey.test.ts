import * as assert from "assert";
import StandardCommands from "../../../devtools/commands/standard";
import { TDevTools } from "@types";

function makeChangekeyParams(): TDevTools.ICommandFileParameters {
	return {
		credential: "cred/bu",
		projectPath: "/project",
		topFolder: "/retrieve/",
		metadata: [{ metadatatype: "dataExtension", key: "myDE", path: "/retrieve/cred/bu/dataExtension" }]
	};
}

suite("StandardCommands – changekey", () => {
	let cmd: StandardCommands;
	setup(() => {
		cmd = new StandardCommands();
	});

	test("changekey uses deploy alias 'd'", () => {
		const result = cmd.changekey({ files: [makeChangekeyParams()], changeKeyField: "name" });
		assert.strictEqual(result.alias, "d");
	});

	test("changekey with changeKeyField adds --changeKeyField flag", () => {
		const result = cmd.changekey({ files: [makeChangekeyParams()], changeKeyField: "name" });
		assert.ok(result.config[0][0].includes("--changeKeyField"));
		assert.ok(result.config[0][0].includes('"name"'));
	});

	test("changekey with changeKeyValue adds --changeKeyValue flag", () => {
		const result = cmd.changekey({ files: [makeChangekeyParams()], changeKeyValue: "newKey" });
		assert.ok(result.config[0][0].includes("--changeKeyValue"));
		assert.ok(result.config[0][0].includes('"newKey"'));
	});

	test("changekey adds --fromRetrieve and --skipValidation", () => {
		const result = cmd.changekey({ files: [makeChangekeyParams()], changeKeyField: "name" });
		const paramStr = result.config[0][0];
		assert.ok(paramStr.includes("--fromRetrieve"));
		assert.ok(paramStr.includes("--skipValidation"));
	});

	test("changekey throws when neither changeKeyField nor changeKeyValue provided", () => {
		assert.throws(() => cmd.changekey({ files: [makeChangekeyParams()] }), /changeKeyField.*changeKeyValue/);
	});

	test("changekey throws when 'files' property is missing", () => {
		assert.throws(() => cmd.changekey({ changeKeyField: "name" }), /\[standard_changekey\]/);
	});

	test("changekey filters out metadata with empty keys", () => {
		const param: TDevTools.ICommandFileParameters = {
			...makeChangekeyParams(),
			metadata: [
				{ metadatatype: "dataExtension", key: "", path: "/retrieve/cred/bu/dataExtension" },
				{ metadatatype: "dataExtension", key: "myDE", path: "/retrieve/cred/bu/dataExtension" }
			]
		};
		const result = cmd.changekey({ files: [param], changeKeyField: "name" });
		assert.strictEqual(result.config.length, 1);
	});
});
