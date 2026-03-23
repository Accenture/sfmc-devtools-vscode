import * as assert from "assert";
import { CONTENT_BLOCK_REGEX, SUPPORTED_FOLDER_REGEX } from "../../../editor/contentBlockLinkProvider";

/** Helper to collect all captured keys from a text string. */
function collectKeys(text: string): string[] {
	const keys: string[] = [];
	const regex = new RegExp(CONTENT_BLOCK_REGEX.source, "g");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		keys.push(match[1]);
	}
	return keys;
}

suite("ContentBlock – CONTENT_BLOCK_REGEX", () => {
	suite("standard calls", () => {
		test('matches ContentBlockByKey("key")', () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("myBlock")'), ["myBlock"]);
		});

		test("matches ContentBlockByKey('key')", () => {
			assert.deepStrictEqual(collectKeys("ContentBlockByKey('myBlock')"), ["myBlock"]);
		});

		test("matches with spaces inside parens", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey( "myBlock" )'), ["myBlock"]);
		});

		test("matches with lots of whitespace", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey(   "myBlock"   )'), ["myBlock"]);
		});
	});

	suite("JSON-escaped quotes", () => {
		test('matches ContentBlockByKey(\\"key\\")', () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey(\\"myBlock\\")'), ["myBlock"]);
		});
	});

	suite("keys with special characters", () => {
		test("matches key with spaces", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("My Content Block")'), ["My Content Block"]);
		});

		test("matches key with hyphens", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("my-block-key")'), ["my-block-key"]);
		});

		test("matches key with underscores", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("my_block_key")'), ["my_block_key"]);
		});

		test("matches key with dots", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("folder.block")'), ["folder.block"]);
		});
	});

	suite("multiple matches in one file", () => {
		test("finds all references in multi-line text", () => {
			const text = [
				'%%=ContentBlockByKey("header")=%%',
				"<p>Body content</p>",
				'%%=ContentBlockByKey("footer")=%%'
			].join("\n");
			assert.deepStrictEqual(collectKeys(text), ["header", "footer"]);
		});

		test("finds references in HTML context", () => {
			const text = '<div>%%=ContentBlockByKey("block1")=%%</div><span>%%=ContentBlockByKey("block2")=%%</span>';
			assert.deepStrictEqual(collectKeys(text), ["block1", "block2"]);
		});
	});

	suite("non-matching inputs", () => {
		test("does not match without parentheses", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey "key"'), []);
		});

		test("does not match empty string argument", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey("")'), []);
		});

		test("does not match ContentBlockById", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockById("123")'), []);
		});

		test("does not match if missing opening quote", () => {
			assert.deepStrictEqual(collectKeys('ContentBlockByKey(myBlock")'), []);
		});
	});

	suite("retrieve and deploy folder regex", () => {
		test("matches retrieve path", () => {
			assert.ok(SUPPORTED_FOLDER_REGEX.test("/workspace/retrieve/cred/bu/asset/other/block.html"));
		});

		test("matches deploy path", () => {
			assert.ok(SUPPORTED_FOLDER_REGEX.test("/workspace/deploy/cred/bu/asset/other/block.html"));
		});

		test("does not match other paths", () => {
			assert.ok(!SUPPORTED_FOLDER_REGEX.test("/workspace/src/myfile.html"));
		});

		test("does not match partial names", () => {
			assert.ok(!SUPPORTED_FOLDER_REGEX.test("/workspace/retriever/cred/bu/file.html"));
		});
	});
});
