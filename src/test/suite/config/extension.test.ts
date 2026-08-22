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

	test("package.json declares the expected companion extensions", () => {
		// SFMC DevTools auto-installs a minimal companion set so that mcdev users
		// who skip the dedicated SFMC extension packs still get a good experience:
		// the language service as the sole hard dependency, and eslint/prettier/
		// data-loader as a soft (individually removable) pack. Output-panel coloring
		// is now built in via the embedded mcdev-log grammar, so IBM.output-colorizer
		// is no longer a hard dependency.
		const manifestPath = path.resolve(process.cwd(), "package.json");
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		assert.deepStrictEqual(
			manifest.extensionDependencies,
			["joernberkefeld.sfmc-language"],
			"package.json must declare the language service as the sole hard dependency"
		);
		assert.ok(
			!manifest.extensionDependencies.includes("IBM.output-colorizer"),
			"IBM.output-colorizer must no longer be a hard dependency"
		);
		assert.deepStrictEqual(
			manifest.extensionPack,
			["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "joernberkefeld.sfmc-data"],
			"package.json must declare the soft companion pack"
		);
	});

	test("package.json embeds the mcdev-log grammar and language", () => {
		// The Output panel is colorized by DevTools itself via an embedded mcdev-log
		// TextMate grammar, so no third-party colorizer extension is required.
		const packageRoot = process.cwd();
		const manifest = JSON.parse(fs.readFileSync(path.resolve(packageRoot, "package.json"), "utf8"));

		const language = manifest.contributes.languages.find(
			(entry: { id: string; configuration: string }) => entry.id === "mcdev-log"
		);
		assert.ok(language, "contributes.languages must declare the mcdev-log language");
		assert.strictEqual(language.configuration, "./mcdev-log.configuration.json");

		const grammar = manifest.contributes.grammars.find(
			(entry: { language: string; scopeName: string; path: string }) => entry.language === "mcdev-log"
		);
		assert.ok(grammar, "contributes.grammars must declare the mcdev-log grammar");
		assert.strictEqual(grammar.scopeName, "code.mcdev-log");
		assert.strictEqual(grammar.path, "./syntaxes/mcdev-log.tmLanguage");

		assert.ok(
			fs.existsSync(path.resolve(packageRoot, grammar.path)),
			"the referenced grammar file must exist on disk"
		);
		assert.ok(
			fs.existsSync(path.resolve(packageRoot, language.configuration)),
			"the referenced language configuration file must exist on disk"
		);
	});

	test("package.json version is 3.4.0", () => {
		const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
		assert.strictEqual(manifest.version, "3.4.0");
	});

	test("delayTimeUpdateStatusBar is a positive number", () => {
		assert.strictEqual(typeof ConfigExtension.delayTimeUpdateStatusBar, "number");
		assert.ok(ConfigExtension.delayTimeUpdateStatusBar > 0);
	});
});
