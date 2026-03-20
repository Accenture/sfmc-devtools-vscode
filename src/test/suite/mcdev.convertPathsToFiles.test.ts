import * as assert from "assert";
import Mcdev from "../../devtools/mcdev";

/**
 * Tests for Mcdev.convertPathsToFiles()
 *
 * Verifies that file paths from VSCode explorer selections are correctly
 * parsed into IExecuteFileDetails objects for all supported selection scenarios:
 * - single file / multiple files
 * - single type folder / multiple type folders
 * - single BU folder / multiple BU folders
 * - both /retrieve/ and /deploy/ top-level folders
 * - mixed selections
 */
suite("Mcdev.convertPathsToFiles", () => {
	let mcdev: Mcdev;

	setup(() => {
		mcdev = new Mcdev();
	});

	// ─── Single file selections ──────────────────────────────────────────────

	suite("single file in /retrieve/", () => {
		test("returns level=file with correct fields", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/email/myEmail.email-meta.json"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "file");
			assert.strictEqual(result[0].projectPath, "/project");
			assert.strictEqual(result[0].topFolder, "/retrieve/");
			assert.strictEqual(result[0].credentialsName, "myCred");
			assert.strictEqual(result[0].businessUnit, "myBU");
			assert.strictEqual(result[0].metadataType, "email");
			assert.strictEqual(result[0].filename, "myEmail");
		});

		test("file path is preserved", () => {
			const path = "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json";
			const result = mcdev.convertPathsToFiles([path]);

			assert.strictEqual(result[0].path, path);
		});
	});

	suite("single file in /deploy/", () => {
		test("returns level=file for deploy folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/deploy/myCred/myBU/email/myEmail.email-meta.json"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "file");
			assert.strictEqual(result[0].topFolder, "/deploy/");
			assert.strictEqual(result[0].credentialsName, "myCred");
			assert.strictEqual(result[0].businessUnit, "myBU");
			assert.strictEqual(result[0].metadataType, "email");
			assert.strictEqual(result[0].filename, "myEmail");
		});
	});

	// ─── Multiple file selections ─────────────────────────────────────────────

	suite("multiple files in /retrieve/", () => {
		test("returns one entry per file", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email/email1.email-meta.json",
				"/project/retrieve/myCred/myBU/email/email2.email-meta.json"
			]);

			assert.strictEqual(result.length, 2);
			result.forEach(r => assert.strictEqual(r.level, "file"));
			assert.strictEqual(result[0].filename, "email1");
			assert.strictEqual(result[1].filename, "email2");
		});

		test("files from different BUs", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/BU1/email/email1.email-meta.json",
				"/project/retrieve/myCred/BU2/email/email2.email-meta.json"
			]);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].businessUnit, "BU1");
			assert.strictEqual(result[1].businessUnit, "BU2");
		});

		test("files from different credentials", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/cred1/myBU/email/email1.email-meta.json",
				"/project/retrieve/cred2/myBU/email/email2.email-meta.json"
			]);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].credentialsName, "cred1");
			assert.strictEqual(result[1].credentialsName, "cred2");
		});
	});

	suite("multiple files in /deploy/", () => {
		test("returns one entry per file with deploy topFolder", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/deploy/myCred/myBU/email/email1.email-meta.json",
				"/project/deploy/myCred/myBU/email/email2.email-meta.json"
			]);

			assert.strictEqual(result.length, 2);
			result.forEach(r => {
				assert.strictEqual(r.level, "file");
				assert.strictEqual(r.topFolder, "/deploy/");
			});
		});
	});

	// ─── Single type folder (mdt_folder) ─────────────────────────────────────

	suite("single type folder in /retrieve/", () => {
		test("returns level=mdt_folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/email"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "mdt_folder");
			assert.strictEqual(result[0].credentialsName, "myCred");
			assert.strictEqual(result[0].businessUnit, "myBU");
			assert.strictEqual(result[0].metadataType, "email");
			assert.strictEqual(result[0].filename, undefined);
		});

		test("returns level=mdt_folder for automation type", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/automation"]);

			assert.strictEqual(result[0].level, "mdt_folder");
			assert.strictEqual(result[0].metadataType, "automation");
		});
	});

	suite("single type folder in /deploy/", () => {
		test("returns level=mdt_folder for deploy folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/deploy/myCred/myBU/email"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "mdt_folder");
			assert.strictEqual(result[0].topFolder, "/deploy/");
		});
	});

	// ─── Multiple type folders ────────────────────────────────────────────────

	suite("multiple type folders in /retrieve/", () => {
		test("returns one mdt_folder entry per folder", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email",
				"/project/retrieve/myCred/myBU/automation"
			]);

			assert.strictEqual(result.length, 2);
			result.forEach(r => assert.strictEqual(r.level, "mdt_folder"));
			assert.strictEqual(result[0].metadataType, "email");
			assert.strictEqual(result[1].metadataType, "automation");
		});

		test("multiple type folders from different BUs", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/BU1/email",
				"/project/retrieve/myCred/BU2/email"
			]);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].businessUnit, "BU1");
			assert.strictEqual(result[1].businessUnit, "BU2");
		});
	});

	// ─── Single BU folder (bu_folder) ────────────────────────────────────────

	suite("single BU folder in /retrieve/", () => {
		test("returns level=bu_folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "bu_folder");
			assert.strictEqual(result[0].credentialsName, "myCred");
			assert.strictEqual(result[0].businessUnit, "myBU");
			assert.strictEqual(result[0].metadataType, undefined);
		});

		test("returns level=bu_folder for deploy folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/deploy/myCred/myBU"]);

			assert.strictEqual(result[0].level, "bu_folder");
			assert.strictEqual(result[0].topFolder, "/deploy/");
		});
	});

	// ─── Multiple BU folders ──────────────────────────────────────────────────

	suite("multiple BU folders in /retrieve/", () => {
		test("returns one bu_folder entry per BU folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/BU1", "/project/retrieve/myCred/BU2"]);

			assert.strictEqual(result.length, 2);
			result.forEach(r => assert.strictEqual(r.level, "bu_folder"));
			assert.strictEqual(result[0].businessUnit, "BU1");
			assert.strictEqual(result[1].businessUnit, "BU2");
		});

		test("BU folders from different credentials", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/cred1/BU1", "/project/retrieve/cred2/BU1"]);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].credentialsName, "cred1");
			assert.strictEqual(result[1].credentialsName, "cred2");
		});
	});

	// ─── Credential folder (cred_folder) ─────────────────────────────────────

	suite("credential folder", () => {
		test("returns level=cred_folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "cred_folder");
			assert.strictEqual(result[0].credentialsName, "myCred");
			assert.strictEqual(result[0].businessUnit, undefined);
		});
	});

	// ─── Top folder (top_folder / retrieve or deploy root) ───────────────────

	suite("top folder", () => {
		test("retrieve root returns level=top_folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "top_folder");
		});

		test("deploy root returns level=top_folder", () => {
			const result = mcdev.convertPathsToFiles(["/project/deploy"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "top_folder");
		});
	});

	// ─── Asset subtype handling ───────────────────────────────────────────────

	suite("asset subtype files", () => {
		test("asset file in asset-subtype subfolder returns asset metadataType", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/asset/block/myBlock.asset-block-meta.json"
			]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].level, "file");
			assert.strictEqual(result[0].metadataType, "asset");
			assert.strictEqual(result[0].filename, "myBlock");
		});

		test("asset subtype folder (e.g. block) returns level=file with asset-block metadataType", () => {
			const result = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/asset/block"]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].metadataType, "asset-block");
		});
	});

	// ─── Mixed selections ─────────────────────────────────────────────────────

	suite("mixed selections", () => {
		test("mix of file, mdt_folder and bu_folder", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/BU1/email/myEmail.email-meta.json",
				"/project/retrieve/myCred/BU1/automation",
				"/project/retrieve/myCred/BU2"
			]);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].level, "file");
			assert.strictEqual(result[1].level, "mdt_folder");
			assert.strictEqual(result[2].level, "bu_folder");
		});

		test("mix of retrieve and deploy files", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email/myEmail.email-meta.json",
				"/project/deploy/myCred/myBU/email/myEmail.email-meta.json"
			]);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].topFolder, "/retrieve/");
			assert.strictEqual(result[1].topFolder, "/deploy/");
		});

		test("mix of single file and multiple type folders", () => {
			const result = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email/myEmail.email-meta.json",
				"/project/retrieve/myCred/myBU/automation",
				"/project/retrieve/myCred/myBU/dataExtension"
			]);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].level, "file");
			assert.strictEqual(result[1].level, "mdt_folder");
			assert.strictEqual(result[2].level, "mdt_folder");
		});
	});
});
