import * as assert from "assert";
import Mcdev from "../../../devtools/mcdev";

suite("Mcdev – convertPathsToFiles", () => {
	let mcdev: Mcdev;
	setup(() => {
		mcdev = new Mcdev();
	});

	test("top_folder level for retrieve folder", () => {
		const result = mcdev.convertPathsToFiles(["/project/retrieve/"]);
		assert.strictEqual(result[0].level, "top_folder");
		assert.strictEqual(result[0].projectPath, "/project");
		assert.strictEqual(result[0].topFolder, "/retrieve/");
	});

	test("cred_folder level", () => {
		const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred"]);
		assert.strictEqual(result[0].level, "cred_folder");
		assert.strictEqual(result[0].credentialsName, "myCred");
	});

	test("bu_folder level", () => {
		const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU"]);
		assert.strictEqual(result[0].level, "bu_folder");
		assert.strictEqual(result[0].credentialsName, "myCred");
		assert.strictEqual(result[0].businessUnit, "myBU");
	});

	test("mdt_folder level", () => {
		const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/dataExtension"]);
		assert.strictEqual(result[0].level, "mdt_folder");
		assert.strictEqual(result[0].metadataType, "dataExtension");
	});

	test("file level for standard type", () => {
		const result = mcdev.convertPathsToFiles([
			"/project/retrieve/myCred/myBU/dataExtension/myDE.dataExtension-meta.json"
		]);
		assert.strictEqual(result[0].level, "file");
		assert.strictEqual(result[0].metadataType, "dataExtension");
		assert.ok(result[0].filename);
	});

	test("file level for asset subtype", () => {
		const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/asset/block"]);
		assert.strictEqual(result[0].level, "file");
		assert.strictEqual(result[0].metadataType, "asset-block");
	});

	test("file level for asset with filename", () => {
		const result = mcdev.convertPathsToFiles([
			"/project/retrieve/myCred/myBU/asset/other/myAsset.asset-asset-meta.json"
		]);
		assert.strictEqual(result[0].level, "file");
		assert.strictEqual(result[0].metadataType, "asset");
	});

	test("deploy folder path", () => {
		const result = mcdev.convertPathsToFiles([
			"/project/deploy/myCred/myBU/dataExtension/myDE.dataExtension-meta.json"
		]);
		assert.strictEqual(result[0].topFolder, "/deploy/");
		assert.strictEqual(result[0].level, "file");
	});

	test("multiple paths", () => {
		const result = mcdev.convertPathsToFiles([
			"/project/retrieve/myCred/myBU/dataExtension/de1.dataExtension-meta.json",
			"/project/retrieve/myCred/myBU/query/q1.query-meta.json"
		]);
		assert.strictEqual(result.length, 2);
	});
});
