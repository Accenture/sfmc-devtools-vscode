import * as assert from "assert";
import { ConfigExtension } from "@config";

suite("Config – extension", () => {
	test("extensionName matches expected value", () => {
		assert.strictEqual(ConfigExtension.extensionName, "sfmc-devtools-vscode");
	});

	test("menuCommands includes expected commands", () => {
		const expected = [
			"changekey",
			"copytobu",
			"delete",
			"deploy",
			"retrieve",
			"execute",
			"schedule",
			"pause",
			"stop",
			"publish",
			"validate",
			"refresh",
			"build",
			"createDeltaPkg",
			"fixKeys"
		];
		assert.deepStrictEqual([...ConfigExtension.menuCommands].sort(), expected.sort());
	});

	test("recommendedExtensions is a non-empty array", () => {
		assert.ok(Array.isArray(ConfigExtension.recommendedExtensions));
		assert.ok(ConfigExtension.recommendedExtensions.length > 0);
	});

	test("delayTimeUpdateStatusBar is a positive number", () => {
		assert.strictEqual(typeof ConfigExtension.delayTimeUpdateStatusBar, "number");
		assert.ok(ConfigExtension.delayTimeUpdateStatusBar > 0);
	});
});
