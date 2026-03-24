import * as assert from "assert";
import { extractFileNameFromPath } from "../../../utils/file";

suite("Utils – file.ts", () => {
	suite("extractFileNameFromPath", () => {
		test("extracts key from double-extension asset file", () => {
			assert.strictEqual(extractFileNameFromPath("/path/to/MyKey.asset-other-meta.html"), "MyKey");
		});

		test("extracts key from double-extension json meta file", () => {
			assert.strictEqual(extractFileNameFromPath("/path/to/MyKey.asset-other-meta.json"), "MyKey");
		});

		test("extracts key from single-extension file", () => {
			assert.strictEqual(extractFileNameFromPath("/path/to/file.txt"), "file");
		});

		test("returns folder name when no dot present", () => {
			assert.strictEqual(extractFileNameFromPath("folderName"), "folderName");
		});

		test("handles deeply nested double-extension paths", () => {
			assert.strictEqual(
				extractFileNameFromPath("/workspace/retrieve/cred/bu/asset/other/MyEmail.asset-message-meta.json"),
				"MyEmail"
			);
		});

		test("handles file with triple-extension", () => {
			// Double extension: strips last two segments
			assert.strictEqual(extractFileNameFromPath("key.type-meta.json"), "key");
		});

		test("handles dataExtension-meta format", () => {
			assert.strictEqual(extractFileNameFromPath("/path/MyDE.dataExtension-meta.json"), "MyDE");
		});

		test("handles query-meta format", () => {
			assert.strictEqual(extractFileNameFromPath("/bu/query/myQuery.query-meta.json"), "myQuery");
		});

		test("handles file with dots in key name", () => {
			assert.strictEqual(extractFileNameFromPath("/path/my.key.asset-other-meta.json"), "my.key");
		});
	});
});
