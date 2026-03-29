import * as assert from "assert";
import AdminCommands from "../../../devtools/commands/admin";

suite("AdminCommands", () => {
	let cmd: AdminCommands;
	setup(() => {
		cmd = new AdminCommands();
	});

	test("commandsList includes explainTypes", () => {
		assert.ok(cmd.commandsList().includes("explainTypes"));
	});

	test("explainTypes returns alias 'et'", () => {
		const result = cmd.explainTypes({ projectPath: "/project" });
		assert.strictEqual(result.alias, "et");
	});

	test("explainTypes includes --json flag", () => {
		const result = cmd.explainTypes({ projectPath: "/project" });
		assert.ok(result.config[0][0].includes("--json"));
	});

	test("explainTypes includes project path", () => {
		const result = cmd.explainTypes({ projectPath: "/myProject" });
		assert.strictEqual(result.config[0][1], "/myProject");
	});

	test("explainTypes throws when projectPath is missing", () => {
		assert.throws(() => cmd.explainTypes({}), /\[admin_explainTypes\]/);
	});

	test("run dispatches to explainTypes", () => {
		const result = cmd.run("explainTypes", { projectPath: "/project" });
		assert.strictEqual(result.alias, "et");
	});

	test("run returns empty config for unknown command", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = cmd.run("unknown" as any, {});
		assert.strictEqual(result.alias, "");
		assert.strictEqual(result.config.length, 0);
	});
});
