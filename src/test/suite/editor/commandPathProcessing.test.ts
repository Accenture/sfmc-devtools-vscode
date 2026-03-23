import * as assert from "assert";
import { removeDuplicates, removeSubPathsByParent } from "../../../utils/lib";

/**
 * Tests for the command path processing logic that occurs when commands
 * receive file paths from VSCode's multi-selection.
 *
 * When a user right-clicks files / folders in the explorer, the extension
 * receives an array of VSCode.Uri objects. The callbacks in commands.ts:
 *   1. Flatten and extract .path (POSIX-style) from each Uri
 *   2. Remove duplicate paths
 *   3. The devtools layer further calls removeSubPathsByParent()
 *
 * These tests verify that the path filtering logic works correctly
 * for all multi-selection scenarios listed in the issue.
 */

suite("Command path processing", () => {
	suite("single file selection", () => {
		test("single file in retrieve", () => {
			const paths = ["/ws/retrieve/cred/bu/query/myQuery.query-meta.json"];
			assert.deepStrictEqual(removeDuplicates(paths), paths);
		});

		test("single file in deploy", () => {
			const paths = ["/ws/deploy/cred/bu/query/myQuery.query-meta.json"];
			assert.deepStrictEqual(removeDuplicates(paths), paths);
		});
	});

	suite("multiple file selection", () => {
		test("multiple files from same type folder", () => {
			const paths = [
				"/ws/retrieve/cred/bu/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu/query/q2.query-meta.json",
				"/ws/retrieve/cred/bu/query/q3.query-meta.json"
			];
			const result = removeDuplicates(paths) as string[];
			assert.strictEqual(result.length, 3);
		});

		test("multiple files from different type folders", () => {
			const paths = [
				"/ws/retrieve/cred/bu/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu/dataExtension/de1.dataExtension-meta.json"
			];
			const result = removeDuplicates(paths) as string[];
			assert.strictEqual(result.length, 2);
		});

		test("duplicate files are removed", () => {
			const paths = [
				"/ws/retrieve/cred/bu/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu/query/q1.query-meta.json"
			];
			const result = removeDuplicates(paths) as string[];
			assert.strictEqual(result.length, 1);
		});
	});

	suite("single type folder selection", () => {
		test("single type folder in retrieve", () => {
			const paths = ["/ws/retrieve/cred/bu/query"];
			assert.deepStrictEqual(removeSubPathsByParent(paths), paths);
		});

		test("single type folder in deploy", () => {
			const paths = ["/ws/deploy/cred/bu/query"];
			assert.deepStrictEqual(removeSubPathsByParent(paths), paths);
		});
	});

	suite("multiple type folder selection", () => {
		test("multiple type folders from same BU", () => {
			const paths = ["/ws/retrieve/cred/bu/query", "/ws/retrieve/cred/bu/dataExtension"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});

		test("type folders from different BUs", () => {
			const paths = ["/ws/retrieve/cred/bu1/query", "/ws/retrieve/cred/bu2/query"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});
	});

	suite("single BU folder selection", () => {
		test("BU folder in retrieve", () => {
			const paths = ["/ws/retrieve/cred/bu"];
			assert.deepStrictEqual(removeSubPathsByParent(paths), paths);
		});

		test("BU folder in deploy", () => {
			const paths = ["/ws/deploy/cred/bu"];
			assert.deepStrictEqual(removeSubPathsByParent(paths), paths);
		});
	});

	suite("multiple BU folder selection", () => {
		test("multiple BU folders", () => {
			const paths = ["/ws/retrieve/cred/bu1", "/ws/retrieve/cred/bu2"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});

		test("BU folders from different credentials", () => {
			const paths = ["/ws/retrieve/cred1/bu1", "/ws/retrieve/cred2/bu2"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});
	});

	suite("mixed selection", () => {
		test("file + parent type folder collapses to folder", () => {
			const paths = ["/ws/retrieve/cred/bu/query/q1.query-meta.json", "/ws/retrieve/cred/bu/query"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], "/ws/retrieve/cred/bu/query");
		});

		test("file + parent BU folder collapses to BU folder", () => {
			const paths = ["/ws/retrieve/cred/bu", "/ws/retrieve/cred/bu/query/q1.query-meta.json"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], "/ws/retrieve/cred/bu");
		});

		test("type folder + parent BU folder collapses to BU folder", () => {
			const paths = ["/ws/retrieve/cred/bu", "/ws/retrieve/cred/bu/query"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], "/ws/retrieve/cred/bu");
		});

		test("mixed files from retrieve and deploy stay separate", () => {
			const paths = [
				"/ws/retrieve/cred/bu/query/q1.query-meta.json",
				"/ws/deploy/cred/bu/query/q1.query-meta.json"
			];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});

		test("complex mix: BU folder + unrelated file + child file", () => {
			const paths = [
				"/ws/retrieve/cred/bu1",
				"/ws/retrieve/cred/bu1/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu2/dataExtension/de1.dataExtension-meta.json"
			];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
			assert.ok(result.includes("/ws/retrieve/cred/bu1"));
			assert.ok(result.includes("/ws/retrieve/cred/bu2/dataExtension/de1.dataExtension-meta.json"));
		});

		test("multiple unrelated items from different BUs", () => {
			const paths = [
				"/ws/retrieve/cred1/bu1/query/q1.query-meta.json",
				"/ws/retrieve/cred2/bu2/dataExtension",
				"/ws/deploy/cred1/bu1/asset/other/block.asset-other-meta.html"
			];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 3);
		});
	});

	suite("retrieve vs deploy path processing", () => {
		test("files from both retrieve and deploy directories", () => {
			const paths = [
				"/ws/retrieve/cred/bu/asset/other/block.asset-other-meta.html",
				"/ws/deploy/cred/bu/asset/other/block.asset-other-meta.html"
			];
			const result = removeDuplicates(paths) as string[];
			assert.strictEqual(result.length, 2);
		});

		test("same BU path in both retrieve and deploy are distinct", () => {
			const paths = ["/ws/retrieve/cred/bu", "/ws/deploy/cred/bu"];
			const result = removeSubPathsByParent(paths);
			assert.strictEqual(result.length, 2);
		});
	});
});
