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

	test("recommendedExtensions contains all expected extensions", () => {
		const expected = [
			"joernberkefeld.sfmc-language",
			"IBM.output-colorizer",
			"aaron-bond.better-comments",
			"dbaeumer.vscode-eslint",
			"editorconfig.editorconfig",
			"esbenp.prettier-vscode"
		];
		assert.deepStrictEqual(
			[...ConfigExtension.recommendedExtensions].sort(),
			expected.sort(),
			"recommendedExtensions must match the canonical list exactly"
		);
	});

	test("sfmc-language is the first recommended extension", () => {
		assert.strictEqual(
			ConfigExtension.recommendedExtensions[0],
			"joernberkefeld.sfmc-language",
			"joernberkefeld.sfmc-language must be first so it is installed before other tools"
		);
	});

	test("every recommendedExtensions entry follows publisher.extensionName format", () => {
		const validId = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+$/;
		for (const ext of ConfigExtension.recommendedExtensions) {
			assert.ok(validId.test(ext), `"${ext}" does not match publisher.extensionName format`);
		}
	});

	test("delayTimeUpdateStatusBar is a positive number", () => {
		assert.strictEqual(typeof ConfigExtension.delayTimeUpdateStatusBar, "number");
		assert.ok(ConfigExtension.delayTimeUpdateStatusBar > 0);
	});
});
