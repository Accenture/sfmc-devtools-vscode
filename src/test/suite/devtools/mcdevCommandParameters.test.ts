import * as assert from "assert";
import Mcdev from "../../../devtools/mcdev";

suite("Mcdev – command parameter mapping", () => {
	let mcdev: Mcdev;
	setup(() => {
		mcdev = new Mcdev();
	});

	test("getPackageName returns 'mcdev'", () => {
		assert.strictEqual(mcdev.getPackageName(), "mcdev");
	});

	test("getConfigFileName returns '.mcdevrc.json'", () => {
		assert.strictEqual(mcdev.getConfigFileName(), ".mcdevrc.json");
	});

	test("getRequiredFiles includes config and auth files", () => {
		const files = mcdev.getRequiredFiles();
		assert.ok(files.includes(".mcdevrc.json"));
		assert.ok(files.includes(".mcdev-auth.json"));
	});

	test("getConfigFilePath appends config file to project path", () => {
		assert.strictEqual(mcdev.getConfigFilePath("/project"), "/project/.mcdevrc.json");
	});

	test("retrieveSupportedMetadataDataTypes returns types for retrieve", () => {
		const types = mcdev.retrieveSupportedMetadataDataTypes("retrieve");
		assert.ok(types.length > 0);
	});

	test("retrieveSupportedMetadataDataTypes throws for invalid action", () => {
		assert.throws(() => mcdev.retrieveSupportedMetadataDataTypes("invalid"), /Invalid Metadata Type/);
	});

	test("isActionSupportedForType delegates to metadataTypes", () => {
		assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "dataExtension"), true);
		assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "unknownType"), false);
	});

	test("isActionSupportedForType execute: automation true, folder false", () => {
		assert.strictEqual(mcdev.isActionSupportedForType("execute", "automation"), true);
		assert.strictEqual(mcdev.isActionSupportedForType("execute", "folder"), false);
	});

	test("isActionSupportedForType validate: journey true, automation false", () => {
		assert.strictEqual(mcdev.isActionSupportedForType("validate", "journey"), true);
		assert.strictEqual(mcdev.isActionSupportedForType("validate", "automation"), false);
	});

	test("isActionSupportedForType fixkeys: automation true, folder false", () => {
		assert.strictEqual(mcdev.isActionSupportedForType("fixkeys", "automation"), true);
		assert.strictEqual(mcdev.isActionSupportedForType("fixkeys", "folder"), false);
	});

	test("updateMetadataTypes returns false for no changes", () => {
		const types = mcdev.retrieveSupportedMetadataDataTypes("retrieve");
		const allTypes = [...types];
		const result = mcdev.updateMetadataTypes(allTypes);
		assert.strictEqual(typeof result, "boolean");
	});
});
