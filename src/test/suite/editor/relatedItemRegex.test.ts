import * as assert from "assert";

/**
 * Tests for the regex patterns used by relatedItemLinkProvider.ts and
 * relatedItemDiagnosticProvider.ts to match JSON relation references.
 */
const R_TYPE_KEY_REGEX = /"r__(\w+)_key"\s*:\s*"([^"]+)"/g;
const AUTOMATION_FORWARD_REGEX = /"r__type"\s*:\s*"([^"]+)"[^{}]*?"r__key"\s*:\s*"([^"]+)"/g;
const AUTOMATION_REVERSE_REGEX = /"r__key"\s*:\s*"([^"]+)"[^{}]*?"r__type"\s*:\s*"([^"]+)"/g;

interface TypeKeyMatch {
	type: string;
	key: string;
}

function collectTypeKeyMatches(text: string): TypeKeyMatch[] {
	const matches: TypeKeyMatch[] = [];
	const regex = new RegExp(R_TYPE_KEY_REGEX.source, "g");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({ type: match[1], key: match[2] });
	}
	return matches;
}

function collectForwardMatches(text: string): TypeKeyMatch[] {
	const matches: TypeKeyMatch[] = [];
	const regex = new RegExp(AUTOMATION_FORWARD_REGEX.source, "g");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({ type: match[1], key: match[2] });
	}
	return matches;
}

function collectReverseMatches(text: string): TypeKeyMatch[] {
	const matches: TypeKeyMatch[] = [];
	const regex = new RegExp(AUTOMATION_REVERSE_REGEX.source, "g");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({ type: match[2], key: match[1] });
	}
	return matches;
}

suite("Related Items – R_TYPE_KEY_REGEX", () => {
	test("matches r__dataExtension_key", () => {
		const text = '"r__dataExtension_key": "myDE"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "dataExtension");
		assert.strictEqual(matches[0].key, "myDE");
	});

	test("matches r__asset_key", () => {
		const text = '"r__asset_key": "myAssetKey"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "asset");
		assert.strictEqual(matches[0].key, "myAssetKey");
	});

	test("matches r__importFile_key", () => {
		const text = '"r__importFile_key": "myImportFile"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "importFile");
	});

	test("matches r__folder_key", () => {
		const text = '"r__folder_key": "myFolder/path"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "folder");
		assert.strictEqual(matches[0].key, "myFolder/path");
	});

	test("matches with extra whitespace around colon", () => {
		const text = '"r__dataExtension_key"  :  "myDE"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 1);
	});

	test("finds multiple references in JSON object", () => {
		const text = [
			"{",
			'  "r__dataExtension_key": "DE1",',
			'  "someField": "value",',
			'  "r__asset_key": "Asset1"',
			"}"
		].join("\n");
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 2);
		assert.strictEqual(matches[0].type, "dataExtension");
		assert.strictEqual(matches[0].key, "DE1");
		assert.strictEqual(matches[1].type, "asset");
		assert.strictEqual(matches[1].key, "Asset1");
	});

	test("does not match r__key without type", () => {
		const text = '"r__key": "value"';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 0);
	});

	test("does not match r__type_key with empty value", () => {
		const text = '"r__dataExtension_key": ""';
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 0);
	});

	test("does not match without double quotes", () => {
		const text = "r__dataExtension_key: myDE";
		const matches = collectTypeKeyMatches(text);
		assert.strictEqual(matches.length, 0);
	});
});

suite("Related Items – AUTOMATION_FORWARD_REGEX", () => {
	test("matches r__type then r__key in same object", () => {
		const text = '{ "r__type": "query", "r__key": "ActivityKey1" }';
		const matches = collectForwardMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "query");
		assert.strictEqual(matches[0].key, "ActivityKey1");
	});

	test("matches with other fields between r__type and r__key", () => {
		const text = '{ "r__type": "dataExtract", "name": "MyExtract", "r__key": "ExtractKey1" }';
		const matches = collectForwardMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "dataExtract");
		assert.strictEqual(matches[0].key, "ExtractKey1");
	});

	test("does NOT match across object boundaries", () => {
		const text = '{ "r__type": "query" }, { "r__key": "ActivityKey1" }';
		const matches = collectForwardMatches(text);
		assert.strictEqual(matches.length, 0);
	});

	test("matches multiple automation steps", () => {
		const text = [
			'{ "r__type": "query", "r__key": "QKey1" },',
			'{ "r__type": "dataExtract", "r__key": "DKey1" }'
		].join("\n");
		const matches = collectForwardMatches(text);
		assert.strictEqual(matches.length, 2);
	});
});

suite("Related Items – AUTOMATION_REVERSE_REGEX", () => {
	test("matches r__key then r__type in same object", () => {
		const text = '{ "r__key": "ActivityKey1", "r__type": "query" }';
		const matches = collectReverseMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "query");
		assert.strictEqual(matches[0].key, "ActivityKey1");
	});

	test("matches with other fields between r__key and r__type", () => {
		const text = '{ "r__key": "FTKey1", "name": "MyFT", "r__type": "fileTransfer" }';
		const matches = collectReverseMatches(text);
		assert.strictEqual(matches.length, 1);
		assert.strictEqual(matches[0].type, "fileTransfer");
		assert.strictEqual(matches[0].key, "FTKey1");
	});

	test("does NOT match across object boundaries", () => {
		const text = '{ "r__key": "Key1" }, { "r__type": "query" }';
		const matches = collectReverseMatches(text);
		assert.strictEqual(matches.length, 0);
	});
});

suite("Related Items – SUPPORTED_FILE_REGEX", () => {
	const SUPPORTED_FILE_REGEX = /\/retrieve\/[^/]+\/[^/]+\/[^/]+\//;

	test("matches retrieve/cred/bu/type/ path", () => {
		assert.ok(SUPPORTED_FILE_REGEX.test("/ws/retrieve/myOrg/myBU/dataExtension/de.json"));
	});

	test("matches retrieve with any type folder", () => {
		assert.ok(SUPPORTED_FILE_REGEX.test("/ws/retrieve/myOrg/myBU/automation/auto.json"));
	});

	test("does not match deploy path", () => {
		assert.ok(!SUPPORTED_FILE_REGEX.test("/ws/deploy/myOrg/myBU/dataExtension/de.json"));
	});

	test("does not match path with only two segments after retrieve", () => {
		assert.ok(!SUPPORTED_FILE_REGEX.test("/ws/retrieve/myOrg/myBU/"));
	});

	test("does not match unrelated path", () => {
		assert.ok(!SUPPORTED_FILE_REGEX.test("/ws/src/myfile.json"));
	});
});
