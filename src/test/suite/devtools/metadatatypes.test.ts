import * as assert from "assert";
import MetadataTypes from "../../../devtools/metadatatypes";
import { TDevTools } from "@types";

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

	test("getSupportedActions includes all new lifecycle and helper actions", () => {
		const actions = mdt.getSupportedActions();
		assert.ok(actions.includes("execute"));
		assert.ok(actions.includes("schedule"));
		assert.ok(actions.includes("pause"));
		assert.ok(actions.includes("stop"));
		assert.ok(actions.includes("publish"));
		assert.ok(actions.includes("validate"));
		assert.ok(actions.includes("refresh"));
		assert.ok(actions.includes("build"));
		assert.ok(actions.includes("fixkeys"));
	});

	test("isValidSupportedAction returns true for valid actions", () => {
		assert.strictEqual(mdt.isValidSupportedAction("retrieve"), true);
		assert.strictEqual(mdt.isValidSupportedAction("deploy"), true);
		assert.strictEqual(mdt.isValidSupportedAction("execute"), true);
		assert.strictEqual(mdt.isValidSupportedAction("validate"), true);
		assert.strictEqual(mdt.isValidSupportedAction("fixkeys"), true);
		assert.strictEqual(mdt.isValidSupportedAction("build"), true);
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

	test("getMetaDataTypesSupportedByAction returns only execute-capable types", () => {
		const types = mdt.getMetaDataTypesSupportedByAction("execute");
		assert.ok(types.length > 0);
		assert.ok(types.every(t => t.supports.execute === true));
		const apiNames = types.map(t => t.apiName);
		assert.ok(apiNames.includes("automation"));
		assert.ok(apiNames.includes("query"));
		assert.ok(apiNames.includes("journey"));
	});

	test("getMetaDataTypesSupportedByAction returns only validate-capable types", () => {
		const types = mdt.getMetaDataTypesSupportedByAction("validate");
		assert.ok(types.length > 0);
		assert.ok(types.every(t => t.supports.validate === true));
		const apiNames = types.map(t => t.apiName);
		assert.ok(apiNames.includes("journey"));
		assert.ok(!apiNames.includes("automation"));
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

	test("isActionSupportedForType execute: automation and query and journey true, folder false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("execute", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "query"), true);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "folder"), false);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "dataExtension"), false);
	});

	test("isActionSupportedForType schedule: automation true, query and journey false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("schedule", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("schedule", "query"), false);
		assert.strictEqual(mdt.isActionSupportedForType("schedule", "journey"), false);
	});

	test("isActionSupportedForType pause: automation and journey true, dataExtension false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("pause", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("pause", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("pause", "dataExtension"), false);
	});

	test("isActionSupportedForType stop: automation and journey true, script false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("stop", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("stop", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("stop", "script"), false);
	});

	test("isActionSupportedForType publish: journey true, automation false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("publish", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("publish", "automation"), false);
		assert.strictEqual(mdt.isActionSupportedForType("publish", "query"), false);
	});

	test("isActionSupportedForType validate: journey true, query and automation false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("validate", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("validate", "query"), false);
		assert.strictEqual(mdt.isActionSupportedForType("validate", "automation"), false);
	});

	test("isActionSupportedForType refresh: triggeredSend and journey true, script false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("refresh", "triggeredSend"), true);
		assert.strictEqual(mdt.isActionSupportedForType("refresh", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("refresh", "script"), false);
	});

	test("isActionSupportedForType build: automation true, attributeGroup false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("build", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("build", "dataExtension"), true);
		assert.strictEqual(mdt.isActionSupportedForType("build", "attributeGroup"), false);
	});

	test("isActionSupportedForType fixkeys: dataExtension true, folder false", () => {
		assert.strictEqual(mdt.isActionSupportedForType("fixkeys", "dataExtension"), true);
		assert.strictEqual(mdt.isActionSupportedForType("fixkeys", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("fixkeys", "folder"), false);
		assert.strictEqual(mdt.isActionSupportedForType("fixkeys", "journey"), false);
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
				retrieveAsTemplate: false,
				execute: false,
				schedule: false,
				pause: false,
				stop: false,
				publish: false,
				validate: false,
				refresh: false
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

	test("updateMetadataTypes preserves extension-defined lifecycle flags when CLI data omits them", () => {
		const stripLifecycleFlags = (t: TDevTools.IMetadataTypes): TDevTools.IMetadataTypes => {
			const { execute, schedule, pause, stop, publish, validate, refresh, ...cliSupports } = t.supports;
			void execute;
			void schedule;
			void pause;
			void stop;
			void publish;
			void validate;
			void refresh;
			return { ...t, supports: cliSupports as TDevTools.MetadataTypesActionsMap };
		};
		const cliTypes = mdt.getAllMetaDataTypes().map(stripLifecycleFlags);
		mdt.updateMetadataTypes(cliTypes);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("schedule", "automation"), true);
		assert.strictEqual(mdt.isActionSupportedForType("pause", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("validate", "journey"), true);
		assert.strictEqual(mdt.isActionSupportedForType("refresh", "triggeredSend"), true);
		assert.strictEqual(mdt.isActionSupportedForType("execute", "folder"), false);
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
