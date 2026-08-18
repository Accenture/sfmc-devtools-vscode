import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
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

	test("package.json does not declare an extensionPack", () => {
		// SFMC DevTools is a single-purpose extension. Companion extensions are
		// offered via the dedicated SFMC extension packs and the mcdev boilerplate
		// workspace recommendations, not by bundling them here.
		const manifestPath = path.resolve(process.cwd(), "package.json");
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		assert.strictEqual(manifest.extensionPack, undefined, "package.json must not reintroduce an extensionPack");
	});

	test("delayTimeUpdateStatusBar is a positive number", () => {
		assert.strictEqual(typeof ConfigExtension.delayTimeUpdateStatusBar, "number");
		assert.ok(ConfigExtension.delayTimeUpdateStatusBar > 0);
	});
});
