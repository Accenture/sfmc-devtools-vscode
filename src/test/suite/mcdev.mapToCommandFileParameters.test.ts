import * as assert from "assert";
import Mcdev from "../../devtools/mcdev";
import { TDevTools } from "@types";

/**
 * Helper: builds a minimal IExecuteFileDetails representing a single file.
 * Provides sensible defaults so individual tests only need to specify what they care about.
 *
 * @param overrides - optional partial IExecuteFileDetails to override defaults
 * @returns a complete IExecuteFileDetails object suitable for use as test input
 */
function makeFileDetail(overrides: Partial<TDevTools.IExecuteFileDetails> = {}): TDevTools.IExecuteFileDetails {
	return {
		level: "file",
		projectPath: "/project",
		topFolder: "/retrieve/",
		path: "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json",
		credentialsName: "myCred",
		businessUnit: "myBU",
		metadataType: "email",
		filename: "myEmail",
		...overrides
	};
}

/**
 * Tests for Mcdev.mapToCommandFileParameters()
 *
 * Verifies that IExecuteFileDetails[] (output of convertPathsToFiles) is
 * correctly mapped to ICommandFileParameters[] (input to command builders).
 *
 * Key behaviors under test:
 * - Credential string format per file level (*, cred/*, cred/bu)
 * - Metadata array content per file level (file vs folder vs no-metadata levels)
 * - Grouping: same project + topFolder + credential → single entry
 * - Separation: different BU, different topFolder, or different project → separate entries
 * - End-to-end: convertPathsToFiles output feeds correctly into this method
 */
suite("Mcdev.mapToCommandFileParameters", () => {
	let mcdev: Mcdev;

	setup(() => {
		mcdev = new Mcdev();
	});

	// ─── Credential format per file level ─────────────────────────────────────

	suite("credential string format by file level", () => {
		test("top_folder → credential '*'", () => {
			const result = mcdev.mapToCommandFileParameters([
				{
					level: "top_folder",
					projectPath: "/project",
					topFolder: "/retrieve/",
					path: "/project/retrieve"
				}
			]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "*");
		});

		test("cred_folder → credential 'myCred/*'", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "cred_folder",
					businessUnit: undefined,
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred"
				})
			]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/*");
		});

		test("bu_folder → credential 'myCred/myBU'", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "bu_folder",
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred/myBU"
				})
			]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
		});

		test("mdt_folder → credential 'myCred/myBU'", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "mdt_folder",
					filename: undefined,
					path: "/project/retrieve/myCred/myBU/email"
				})
			]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
		});

		test("file → credential 'myCred/myBU'", () => {
			const result = mcdev.mapToCommandFileParameters([makeFileDetail()]);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
		});
	});

	// ─── Metadata array content per file level ────────────────────────────────

	suite("metadata content by file level", () => {
		test("top_folder → no metadata entry (empty array)", () => {
			const result = mcdev.mapToCommandFileParameters([
				{
					level: "top_folder",
					projectPath: "/project",
					topFolder: "/retrieve/",
					path: "/project/retrieve"
				}
			]);
			assert.deepStrictEqual(result[0].metadata, []);
		});

		test("cred_folder → no metadata entry (empty array)", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "cred_folder",
					businessUnit: undefined,
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred"
				})
			]);
			assert.deepStrictEqual(result[0].metadata, []);
		});

		test("bu_folder → no metadata entry (empty array)", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "bu_folder",
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred/myBU"
				})
			]);
			assert.deepStrictEqual(result[0].metadata, []);
		});

		test("mdt_folder → metadata entry with empty key", () => {
			const path = "/project/retrieve/myCred/myBU/email";
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({ level: "mdt_folder", filename: undefined, path })
			]);
			assert.strictEqual(result[0].metadata.length, 1);
			assert.strictEqual(result[0].metadata[0].metadatatype, "email");
			assert.strictEqual(result[0].metadata[0].key, "");
			assert.strictEqual(result[0].metadata[0].path, path);
		});

		test("file → metadata entry with filename as key", () => {
			const path = "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json";
			const result = mcdev.mapToCommandFileParameters([makeFileDetail({ path })]);
			assert.strictEqual(result[0].metadata.length, 1);
			assert.strictEqual(result[0].metadata[0].metadatatype, "email");
			assert.strictEqual(result[0].metadata[0].key, "myEmail");
			assert.strictEqual(result[0].metadata[0].path, path);
		});
	});

	// ─── Grouping: same credential → combined ─────────────────────────────────

	suite("grouping by credential", () => {
		test("two files from same BU → combined into single credential group", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					filename: "email1",
					path: "/project/retrieve/myCred/myBU/email/email1.email-meta.json"
				}),
				makeFileDetail({
					filename: "email2",
					path: "/project/retrieve/myCred/myBU/email/email2.email-meta.json"
				})
			]);
			assert.strictEqual(result.length, 1, "expected single credential group for same BU");
			assert.strictEqual(result[0].metadata.length, 2, "expected both file entries in metadata");
			assert.ok(
				result[0].metadata.some(m => m.key === "email1"),
				"expected email1 in metadata"
			);
			assert.ok(
				result[0].metadata.some(m => m.key === "email2"),
				"expected email2 in metadata"
			);
		});

		test("mdt_folder and file from same BU → combined into single credential group", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "mdt_folder",
					metadataType: "automation",
					filename: undefined,
					path: "/project/retrieve/myCred/myBU/automation"
				}),
				makeFileDetail({
					level: "file",
					metadataType: "email",
					filename: "myEmail",
					path: "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json"
				})
			]);
			assert.strictEqual(result.length, 1, "expected single credential group for same BU");
			assert.strictEqual(result[0].metadata.length, 2, "expected both entries in metadata");
			const automationEntry = result[0].metadata.find(m => m.metadatatype === "automation");
			const emailEntry = result[0].metadata.find(m => m.metadatatype === "email");
			assert.ok(automationEntry, "expected automation folder metadata");
			assert.strictEqual(automationEntry!.key, "", "folder-level entry should have empty key");
			assert.ok(emailEntry, "expected email file metadata");
			assert.strictEqual(emailEntry!.key, "myEmail", "file-level entry should have filename as key");
		});
	});

	// ─── Separation: different credential/topFolder/project → separate entries ──

	suite("separation into distinct entries", () => {
		test("files from different BUs → separate credential group entries", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					businessUnit: "BU1",
					path: "/project/retrieve/myCred/BU1/email/myEmail.email-meta.json"
				}),
				makeFileDetail({
					businessUnit: "BU2",
					path: "/project/retrieve/myCred/BU2/email/myEmail.email-meta.json"
				})
			]);
			assert.strictEqual(result.length, 2, "expected separate entries for different BUs");
			assert.ok(
				result.some(r => r.credential === "myCred/BU1"),
				"expected myCred/BU1 entry"
			);
			assert.ok(
				result.some(r => r.credential === "myCred/BU2"),
				"expected myCred/BU2 entry"
			);
		});

		test("same credential different topFolders (/retrieve/ vs /deploy/) → separate entries", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					topFolder: "/retrieve/",
					path: "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json"
				}),
				makeFileDetail({
					topFolder: "/deploy/",
					path: "/project/deploy/myCred/myBU/email/myEmail.email-meta.json"
				})
			]);
			assert.strictEqual(result.length, 2, "expected separate entries for different topFolders");
			const retrieveEntry = result.find(r => r.topFolder === "/retrieve/");
			const deployEntry = result.find(r => r.topFolder === "/deploy/");
			assert.ok(retrieveEntry, "expected retrieve topFolder entry");
			assert.ok(deployEntry, "expected deploy topFolder entry");
		});

		test("files from different projects → separate project-level entries", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					projectPath: "/project1",
					path: "/project1/retrieve/myCred/myBU/email/myEmail.email-meta.json"
				}),
				makeFileDetail({
					projectPath: "/project2",
					path: "/project2/retrieve/myCred/myBU/email/myEmail.email-meta.json"
				})
			]);
			assert.strictEqual(result.length, 2, "expected separate entries for different projects");
			assert.ok(
				result.some(r => r.projectPath === "/project1"),
				"expected /project1 entry"
			);
			assert.ok(
				result.some(r => r.projectPath === "/project2"),
				"expected /project2 entry"
			);
		});

		test("multiple BU folders → each gets its own credential group", () => {
			const result = mcdev.mapToCommandFileParameters([
				makeFileDetail({
					level: "bu_folder",
					businessUnit: "BU1",
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred/BU1"
				}),
				makeFileDetail({
					level: "bu_folder",
					businessUnit: "BU2",
					metadataType: undefined,
					filename: undefined,
					path: "/project/retrieve/myCred/BU2"
				})
			]);
			assert.strictEqual(result.length, 2, "expected separate entries for different BU folders");
			assert.ok(
				result.some(r => r.credential === "myCred/BU1"),
				"expected myCred/BU1 entry"
			);
			assert.ok(
				result.some(r => r.credential === "myCred/BU2"),
				"expected myCred/BU2 entry"
			);
		});
	});

	// ─── End-to-end: convertPathsToFiles → mapToCommandFileParameters ─────────

	suite("end-to-end: convertPathsToFiles → mapToCommandFileParameters", () => {
		test("single file path → correct credential and metadata key", () => {
			const fileDetails = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email/myEmail.email-meta.json"
			]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
			assert.strictEqual(result[0].metadata.length, 1);
			assert.strictEqual(result[0].metadata[0].key, "myEmail");
			assert.strictEqual(result[0].metadata[0].metadatatype, "email");
		});

		test("mdt_folder path → credential and metadata with empty key", () => {
			const fileDetails = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU/dataExtension"]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
			assert.strictEqual(result[0].metadata[0].metadatatype, "dataExtension");
			assert.strictEqual(result[0].metadata[0].key, "");
		});

		test("bu_folder path → credential 'myCred/myBU' with no metadata", () => {
			const fileDetails = mcdev.convertPathsToFiles(["/project/retrieve/myCred/myBU"]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/myBU");
			assert.deepStrictEqual(result[0].metadata, []);
		});

		test("cred_folder path → credential 'myCred/*' with no metadata", () => {
			const fileDetails = mcdev.convertPathsToFiles(["/project/retrieve/myCred"]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].credential, "myCred/*");
			assert.deepStrictEqual(result[0].metadata, []);
		});

		test("two files from same BU → combined, two from different BU → separate", () => {
			const fileDetails = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/BU1/email/email1.email-meta.json",
				"/project/retrieve/myCred/BU1/email/email2.email-meta.json",
				"/project/retrieve/myCred/BU2/email/email3.email-meta.json"
			]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 2, "expected one group for BU1 and one for BU2");
			const bu1Group = result.find(r => r.credential === "myCred/BU1");
			const bu2Group = result.find(r => r.credential === "myCred/BU2");
			assert.ok(bu1Group, "expected BU1 group");
			assert.ok(bu2Group, "expected BU2 group");
			assert.strictEqual(bu1Group!.metadata.length, 2, "expected both BU1 files combined");
			assert.strictEqual(bu2Group!.metadata.length, 1, "expected one BU2 file");
		});

		test("retrieve and deploy paths for same credential → separate topFolder groups", () => {
			const fileDetails = mcdev.convertPathsToFiles([
				"/project/retrieve/myCred/myBU/email/myEmail.email-meta.json",
				"/project/deploy/myCred/myBU/email/myEmail.email-meta.json"
			]);
			const result = mcdev.mapToCommandFileParameters(fileDetails);
			assert.strictEqual(result.length, 2, "expected separate groups for retrieve and deploy");
			assert.ok(
				result.some(r => r.topFolder === "/retrieve/"),
				"expected /retrieve/ group"
			);
			assert.ok(
				result.some(r => r.topFolder === "/deploy/"),
				"expected /deploy/ group"
			);
		});
	});
});
