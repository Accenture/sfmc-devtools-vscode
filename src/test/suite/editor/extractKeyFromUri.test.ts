import * as assert from "assert";
import { extractKeyFromUri } from "../../../editor/contentBlockLinkProvider";
import { Uri } from "vscode";

suite("extractKeyFromUri", () => {
	test("extracts key from double-extension asset file", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/asset/other/MyKey.asset-other-meta.html");
		assert.strictEqual(extractKeyFromUri(uri), "MyKey");
	});

	test("extracts key from JSON asset meta file", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/asset/other/MyKey.asset-other-meta.json");
		assert.strictEqual(extractKeyFromUri(uri), "MyKey");
	});

	test("extracts key from block asset file", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/asset/block/BlockName.asset-block-meta.html");
		assert.strictEqual(extractKeyFromUri(uri), "BlockName");
	});

	test("extracts key from message asset file", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/asset/message/Email/Email.asset-message-meta.json");
		assert.strictEqual(extractKeyFromUri(uri), "Email");
	});

	test("handles key with dots", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/asset/other/my.dotted.key.asset-other-meta.json");
		assert.strictEqual(extractKeyFromUri(uri), "my.dotted.key");
	});

	test("handles file with single extension", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/query/myQuery.sql");
		assert.strictEqual(extractKeyFromUri(uri), "myQuery");
	});

	test("returns filename if no extension", () => {
		const uri = Uri.file("/workspace/retrieve/cred/bu/type/noExtFile");
		assert.strictEqual(extractKeyFromUri(uri), "noExtFile");
	});

	test("returns undefined for URI with no path segments", () => {
		// Empty path should return undefined
		const uri = Uri.parse("file:///");
		const result = extractKeyFromUri(uri);
		// The path "/" has a pop() of "" which is falsy
		assert.strictEqual(result, undefined);
	});
});
