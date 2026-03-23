import * as assert from "assert";
import {
	removeDuplicates,
	removeSubPathsByParent,
	removeLeadingRootDrivePath,
	getCurrentTime
} from "../../../utils/lib";

suite("Utils – lib.ts", () => {
	suite("removeDuplicates", () => {
		test("removes duplicate strings", () => {
			assert.deepStrictEqual(removeDuplicates(["a", "b", "a", "c", "b"]), ["a", "b", "c"]);
		});

		test("removes duplicate numbers", () => {
			assert.deepStrictEqual(removeDuplicates([1, 2, 3, 2, 1]), [1, 2, 3]);
		});

		test("returns empty array for empty input", () => {
			assert.deepStrictEqual(removeDuplicates([]), []);
		});

		test("keeps single element", () => {
			assert.deepStrictEqual(removeDuplicates(["only"]), ["only"]);
		});

		test("preserves original order", () => {
			assert.deepStrictEqual(removeDuplicates(["c", "a", "b", "a"]), ["c", "a", "b"]);
		});
	});

	suite("removeSubPathsByParent", () => {
		test("removes child paths when parent exists", () => {
			const paths = ["/workspace/retrieve/cred/bu", "/workspace/retrieve/cred/bu/query/myQuery.sql"];
			const result = removeSubPathsByParent(paths);
			assert.deepStrictEqual(result, ["/workspace/retrieve/cred/bu"]);
		});

		test("keeps unrelated paths", () => {
			const paths = ["/workspace/retrieve/cred1/bu1", "/workspace/retrieve/cred2/bu2"];
			const result = removeSubPathsByParent(paths);
			assert.deepStrictEqual(result, ["/workspace/retrieve/cred1/bu1", "/workspace/retrieve/cred2/bu2"]);
		});

		test("handles single path", () => {
			assert.deepStrictEqual(removeSubPathsByParent(["/single/path"]), ["/single/path"]);
		});

		test("handles empty array", () => {
			assert.deepStrictEqual(removeSubPathsByParent([]), []);
		});

		test("removes multiple nested children", () => {
			const paths = [
				"/ws/retrieve/cred/bu",
				"/ws/retrieve/cred/bu/query",
				"/ws/retrieve/cred/bu/query/myQuery.sql",
				"/ws/retrieve/cred/bu/dataExtension"
			];
			const result = removeSubPathsByParent(paths);
			assert.deepStrictEqual(result, ["/ws/retrieve/cred/bu"]);
		});

		test("handles mixed file and folder selections", () => {
			const paths = [
				"/ws/retrieve/cred/bu1/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu2/dataExtension",
				"/ws/retrieve/cred/bu2/dataExtension/de1.dataExtension-meta.json"
			];
			const result = removeSubPathsByParent(paths);
			assert.deepStrictEqual(result, [
				"/ws/retrieve/cred/bu1/query/q1.query-meta.json",
				"/ws/retrieve/cred/bu2/dataExtension"
			]);
		});

		test("handles retrieve and deploy paths", () => {
			const paths = ["/ws/retrieve/cred/bu/query", "/ws/deploy/cred/bu/query"];
			const result = removeSubPathsByParent(paths);
			assert.deepStrictEqual(result, ["/ws/deploy/cred/bu/query", "/ws/retrieve/cred/bu/query"]);
		});
	});

	suite("removeLeadingRootDrivePath", () => {
		test("removes Windows-style drive letter", () => {
			assert.strictEqual(removeLeadingRootDrivePath("/C:/Users/foo/bar"), "/Users/foo/bar");
		});

		test("removes lowercase drive letter", () => {
			assert.strictEqual(removeLeadingRootDrivePath("/d:/workspace/project"), "/workspace/project");
		});

		test("leaves POSIX paths unchanged", () => {
			assert.strictEqual(removeLeadingRootDrivePath("/home/user/project"), "/home/user/project");
		});

		test("leaves empty string unchanged", () => {
			assert.strictEqual(removeLeadingRootDrivePath(""), "");
		});
	});

	suite("getCurrentTime", () => {
		test("returns string in HH:MM:SS format", () => {
			const result = getCurrentTime();
			assert.match(result, /^\d{2}:\d{2}:\d{2}$/);
		});
	});
});
