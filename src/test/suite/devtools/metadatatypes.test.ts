import * as assert from "assert";
import MetadataTypes from "../../../devtools/metadatatypes";

suite("MetadataTypes", () => {
	let mdt: MetadataTypes;
	setup(() => {
		mdt = new MetadataTypes();
	});

	test("getSupportedActions returns retrieve, deploy, delete, changekey", () => {
		const actions = mdt.getSupportedActions();
		assert.ok(actions.includes("retrieve"));
		assert.ok(actions.includes("deploy"));
		assert.ok(actions.includes("delete"));
		assert.ok(actions.includes("changekey"));
	});

	test("isValidSupportedAction returns true for valid actions", () => {
		assert.strictEqual(mdt.isValidSupportedAction("retrieve"), true);
		assert.strictEqual(mdt.isValidSupportedAction("deploy"), true);
	});

	test("isValidSupportedAction returns false for invalid actions", () => {
		assert.strictEqual(mdt.isValidSupportedAction("invalid"), false);
		assert.strictEqual(mdt.isValidSupportedAction(""), false);
	});

	test("getMetaDataTypesSupportedByAction returns types for retrieve", () => {
		const types = mdt.getMetaDataTypesSupportedByAction("retrieve");
		assert.ok(types.length > 0);
		assert.ok(types.every(t => t.supports.retrieve === true));
	});

	test("getMetaDataTypesSupportedByAction returns types for deploy", () => {
		const types = mdt.getMetaDataTypesSupportedByAction("deploy");
		assert.ok(types.length > 0);
		assert.ok(types.every(t => t.supports.create === true || t.supports.update === true));
	});

	test("getMetaDataTypesSupportedByAction returns types for delete", () => {
		const types = mdt.getMetaDataTypesSupportedByAction("delete");
		assert.ok(types.length > 0);
		assert.ok(types.every(t => t.supports.delete === true));
	});

	test("isActionSupportedForType returns true for supported action", () => {
		assert.strictEqual(mdt.isActionSupportedForType("retrieve", "dataExtension"), true);
		assert.strictEqual(mdt.isActionSupportedForType("delete", "dataExtension"), true);
	});

	test("isActionSupportedForType returns false for unsupported action", () => {
		assert.strictEqual(mdt.isActionSupportedForType("delete", "folder"), false);
	});

	test("isActionSupportedForType handles asset subtypes", () => {
		assert.strictEqual(mdt.isActionSupportedForType("retrieve", "asset-block"), true);
		assert.strictEqual(mdt.isActionSupportedForType("delete", "asset-block"), true);
	});

	test("isActionSupportedForType returns false for unknown type", () => {
		assert.strictEqual(mdt.isActionSupportedForType("retrieve", "unknownType"), false);
	});

	test("updateMetadataTypes returns true when types change", () => {
		const types = mdt.getAllMetaDataTypes();
		const modified = [...types.slice(1)];
		assert.strictEqual(mdt.updateMetadataTypes(modified), true);
	});

	test("updateMetadataTypes returns false when types are unchanged", () => {
		const types = mdt.getAllMetaDataTypes();
		assert.strictEqual(mdt.updateMetadataTypes([...types]), false);
	});

	test("updateMetadataTypes detects new types", () => {
		const types = [...mdt.getAllMetaDataTypes()];
		types.push({
			name: "NewType",
			apiName: "newType",
			retrieveByDefault: false,
			supports: {
				retrieve: true,
				create: false,
				update: false,
				delete: false,
				changeKey: false,
				buildTemplate: false,
				retrieveAsTemplate: false
			},
			description: "test"
		});
		assert.strictEqual(mdt.updateMetadataTypes(types), true);
	});

	test("updateMetadataTypes detects changed properties", () => {
		const types = mdt.getAllMetaDataTypes().map(t => ({ ...t }));
		types[0] = { ...types[0], description: "CHANGED DESCRIPTION" };
		assert.strictEqual(mdt.updateMetadataTypes(types), true);
	});

	test("handleFileConfiguration returns asset subtype for single asset file", () => {
		const result = mdt.handleFileConfiguration("asset", ["block"]);
		assert.strictEqual(result.metadataTypeName, "asset-block");
	});

	test("handleFileConfiguration returns filename for asset with multiple parts", () => {
		const result = mdt.handleFileConfiguration("asset", ["other", "myFile.asset-asset-meta.json"]);
		assert.strictEqual(result.metadataTypeName, "asset");
		assert.ok(result.filename);
	});

	test("handleFileConfiguration returns filename for non-asset type", () => {
		const result = mdt.handleFileConfiguration("dataExtension", ["myDE.dataExtension-meta.json"]);
		assert.ok(result.filename);
	});

	test("handleFileConfiguration returns filename for folder type", () => {
		const result = mdt.handleFileConfiguration("folder", ["myFolder.folder-meta.json"]);
		assert.ok(result.filename);
	});
});
