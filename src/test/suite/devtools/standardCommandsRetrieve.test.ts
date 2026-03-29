import * as assert from "assert";
import StandardCommands from "../../../devtools/commands/standard";
import { TDevTools } from "@types";

function makeRetrieveParams(count: number): TDevTools.ICommandFileParameters {
	const metadata: TDevTools.IMetadataCommand[] = Array.from({ length: count }, (_, i) => ({
		metadatatype: "dataExtension",
		key: `key${i}`,
		path: "/retrieve/cred/bu/dataExtension"
	}));
	return {
		credential: "cred/bu",
		projectPath: "/project",
		topFolder: "/retrieve/",
		metadata
	};
}

suite("StandardCommands – retrieve", () => {
	let cmd: StandardCommands;
	setup(() => {
		cmd = new StandardCommands();
	});

	test("retrieve returns alias 'r'", () => {
		const param = makeRetrieveParams(1);
		const result = cmd.retrieve({ files: [param] });
		assert.strictEqual(result.alias, "r");
	});

	test("retrieve builds config entries for each file parameter", () => {
		const param1 = makeRetrieveParams(2);
		const param2: TDevTools.ICommandFileParameters = {
			credential: "cred2/bu2",
			projectPath: "/project2",
			topFolder: "/retrieve/",
			metadata: [{ metadatatype: "query", key: "myQuery", path: "/retrieve/cred2/bu2/query" }]
		};
		const result = cmd.retrieve({ files: [param1, param2] });
		assert.strictEqual(result.config.length, 2);
	});

	test("retrieve throws when 'files' property is missing", () => {
		assert.throws(() => cmd.retrieve({}), /\[standard_retrieve\]/);
	});

	test("retrieve config includes project path", () => {
		const param = makeRetrieveParams(1);
		const result = cmd.retrieve({ files: [param] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	test("retrieve includes metadata in parameters string", () => {
		const param = makeRetrieveParams(1);
		const result = cmd.retrieve({ files: [param] });
		assert.ok(result.config[0][0].includes("-m dataExtension"));
	});
});
