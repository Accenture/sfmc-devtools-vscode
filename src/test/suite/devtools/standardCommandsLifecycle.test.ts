import * as assert from "assert";
import StandardCommands from "../../../devtools/commands/standard";
import { TDevTools } from "@types";

function makeFileParams(opts?: Partial<TDevTools.ICommandFileParameters>): TDevTools.ICommandFileParameters {
	return {
		credential: "cred/bu",
		projectPath: "/project",
		topFolder: "/retrieve/",
		metadata: [{ metadatatype: "automation", key: "myAutomation", path: "/retrieve/cred/bu/automation" }],
		...opts
	};
}

suite("StandardCommands – lifecycle commands", () => {
	let cmd: StandardCommands;
	setup(() => {
		cmd = new StandardCommands();
	});

	// commandsList coverage
	test("commandsList includes all lifecycle commands", () => {
		const list = cmd.commandsList();
		assert.ok(list.includes("execute"));
		assert.ok(list.includes("schedule"));
		assert.ok(list.includes("pause"));
		assert.ok(list.includes("stop"));
		assert.ok(list.includes("publish"));
		assert.ok(list.includes("validate"));
		assert.ok(list.includes("refresh"));
	});

	// execute
	test("execute returns alias 'exec'", () => {
		const result = cmd.execute({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "exec");
	});

	test("execute throws when 'files' property is missing", () => {
		assert.throws(() => cmd.execute({}), /\[standard_execute\]/);
	});

	test("execute includes project path in config", () => {
		const result = cmd.execute({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	test("execute with schedule parameter adds --schedule flag", () => {
		const result = cmd.execute({ files: [makeFileParams()], schedule: true });
		assert.ok(result.config[0][0].includes("--schedule"));
	});

	test("execute without schedule parameter does not add --schedule flag", () => {
		const result = cmd.execute({ files: [makeFileParams()] });
		assert.ok(!result.config[0][0].includes("--schedule"));
	});

	// schedule
	test("schedule returns alias 'sched'", () => {
		const result = cmd.schedule({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "sched");
	});

	test("schedule throws when 'files' property is missing", () => {
		assert.throws(() => cmd.schedule({}), /\[standard_schedule\]/);
	});

	test("schedule includes project path in config", () => {
		const result = cmd.schedule({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	// pause
	test("pause returns alias 'p'", () => {
		const result = cmd.pause({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "p");
	});

	test("pause throws when 'files' property is missing", () => {
		assert.throws(() => cmd.pause({}), /\[standard_pause\]/);
	});

	test("pause includes project path in config", () => {
		const result = cmd.pause({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	// stop
	test("stop returns alias 'stop'", () => {
		const result = cmd.stop({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "stop");
	});

	test("stop throws when 'files' property is missing", () => {
		assert.throws(() => cmd.stop({}), /\[standard_stop\]/);
	});

	test("stop includes project path in config", () => {
		const result = cmd.stop({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	// publish
	test("publish returns alias 'activate'", () => {
		const result = cmd.publish({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "activate");
	});

	test("publish throws when 'files' property is missing", () => {
		assert.throws(() => cmd.publish({}), /\[standard_publish\]/);
	});

	test("publish with skipStatusCheck adds --skipStatusCheck flag", () => {
		const result = cmd.publish({ files: [makeFileParams()], skipStatusCheck: true });
		assert.ok(result.config[0][0].includes("--skipStatusCheck"));
	});

	test("publish without skipStatusCheck does not add --skipStatusCheck flag", () => {
		const result = cmd.publish({ files: [makeFileParams()] });
		assert.ok(!result.config[0][0].includes("--skipStatusCheck"));
	});

	// validate
	test("validate returns alias 'validate'", () => {
		const result = cmd.validate({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "validate");
	});

	test("validate throws when 'files' property is missing", () => {
		assert.throws(() => cmd.validate({}), /\[standard_validate\]/);
	});

	test("validate includes project path in config", () => {
		const result = cmd.validate({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	// refresh
	test("refresh returns alias 're'", () => {
		const result = cmd.refresh({ files: [makeFileParams()] });
		assert.strictEqual(result.alias, "re");
	});

	test("refresh throws when 'files' property is missing", () => {
		assert.throws(() => cmd.refresh({}), /\[standard_refresh\]/);
	});

	test("refresh includes project path in config", () => {
		const result = cmd.refresh({ files: [makeFileParams()] });
		assert.strictEqual(result.config[0][1], "/project");
	});

	// run dispatch
	test("run dispatches to execute", () => {
		const result = cmd.run("execute", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "exec");
	});

	test("run dispatches to schedule", () => {
		const result = cmd.run("schedule", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "sched");
	});

	test("run dispatches to pause", () => {
		const result = cmd.run("pause", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "p");
	});

	test("run dispatches to stop", () => {
		const result = cmd.run("stop", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "stop");
	});

	test("run dispatches to publish", () => {
		const result = cmd.run("publish", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "activate");
	});

	test("run dispatches to validate", () => {
		const result = cmd.run("validate", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "validate");
	});

	test("run dispatches to refresh", () => {
		const result = cmd.run("refresh", { files: [makeFileParams()] });
		assert.strictEqual(result.alias, "re");
	});
});
