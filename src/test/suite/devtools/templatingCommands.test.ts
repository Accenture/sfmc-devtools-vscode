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
