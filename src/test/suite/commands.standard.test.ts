import * as assert from "assert";
import StandardCommands from "../../devtools/commands/standard";
import { TDevTools } from "@types";

/**
 * Helper to build a minimal ICommandFileParameters for testing.
 * Provides sensible defaults so individual tests only specify what they care about.
 */
function makeFileParam(overrides: Partial<TDevTools.ICommandFileParameters> = {}): TDevTools.ICommandFileParameters {
	return {
		credential: "myCred/myBU",
		projectPath: "/project",
		topFolder: "/retrieve/",
		metadata: [
			{
				metadatatype: "email",
				key: "myEmail",
				path: "/project/retrieve/myCred/myBU/email/myEmail.email-meta.json"
			}
		],
		...overrides
	};
}

/**
 * Helper to build a metadata entry for folder-level operations (no key).
 */
function makeFolderMetadata(metadatatype: string): TDevTools.IMetadataCommand {
	return { metadatatype, key: "", path: `/project/retrieve/myCred/myBU/${metadatatype}` };
}

/**
 * Tests for StandardCommands: retrieve, deploy, delete, changekey
 *
 * Each command is tested for:
 * - 1 selected file (in /retrieve/ and /deploy/)
 * - multiple selected files
 * - 1 selected type folder (mdt_folder → key is "")
 * - multiple selected type folders
 * - BU-level (all metadata) selections (key is "")
 * - mixed file and folder selections
 */
suite("StandardCommands", () => {
	let cmd: StandardCommands;

	setup(() => {
		cmd = new StandardCommands();
	});

	// ─── commandsList ──────────────────────────────────────────────────────────

	test("commandsList includes retrieve, deploy, delete, changekey", () => {
		const list = cmd.commandsList();
		assert.ok(list.includes("retrieve"), "missing retrieve");
		assert.ok(list.includes("deploy"), "missing deploy");
		assert.ok(list.includes("delete"), "missing delete");
		assert.ok(list.includes("changekey"), "missing changekey");
	});

	// ─── retrieve ─────────────────────────────────────────────────────────────

	suite("retrieve", () => {
		test("1 selected file in /retrieve/ — alias is 'r'", () => {
			const result = cmd.retrieve({ files: [makeFileParam()] });
			assert.strictEqual(result.alias, "r");
		});

		test("1 selected file in /retrieve/ — generates correct parameters", () => {
			const result = cmd.retrieve({ files: [makeFileParam()] });
			assert.strictEqual(result.config.length, 1);
			const [params, projectPath] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected metadata flag");
			assert.ok(params.includes('"myEmail"'), "expected key in metadata");
			assert.ok(params.includes("--y"), "expected skip interaction flag");
			assert.ok(params.includes("--noLogColors"), "expected no log colors flag");
			assert.strictEqual(projectPath, "/project");
		});

		test("1 selected file in /deploy/ — alias is 'r'", () => {
			const result = cmd.retrieve({ files: [makeFileParam({ topFolder: "/deploy/" })] });
			assert.strictEqual(result.alias, "r");
		});

		test("multiple selected files — one config entry per file parameter group", () => {
			const result = cmd.retrieve({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })]
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("1 selected type folder (mdt_folder) — key is empty string", () => {
			const result = cmd.retrieve({
				files: [makeFileParam({ metadata: [makeFolderMetadata("email")] })]
			});
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected metadata flag");
			assert.ok(!params.includes(':"'), "should not include a key for folder selection");
		});

		test("multiple selected type folders — one config entry per credential group", () => {
			const result = cmd.retrieve({
				files: [
					makeFileParam({
						metadata: [makeFolderMetadata("email"), makeFolderMetadata("automation")]
					})
				]
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected email metadata flag");
			assert.ok(params.includes("-m automation"), "expected automation metadata flag");
		});

		test("multiple type folders from different BUs — separate config entries", () => {
			const result = cmd.retrieve({
				files: [
					makeFileParam({ credential: "myCred/BU1", metadata: [makeFolderMetadata("email")] }),
					makeFileParam({ credential: "myCred/BU2", metadata: [makeFolderMetadata("email")] })
				]
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("mix of file and type folder — both included in same credential group params", () => {
			const result = cmd.retrieve({
				files: [
					makeFileParam({
						metadata: [
							{ metadatatype: "email", key: "myEmail", path: "..." },
							makeFolderMetadata("automation")
						]
					})
				]
			});
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected file-level email flag");
			assert.ok(params.includes("-m automation"), "expected folder-level automation flag");
		});

		test("throws when 'files' property is missing", () => {
			assert.throws(() => cmd.retrieve({}), /\[standard_retrieve\]: The property 'files' is missing/);
		});
	});

	// ─── deploy ───────────────────────────────────────────────────────────────

	suite("deploy", () => {
		test("1 file from /deploy/ — alias is 'd' without --fromRetrieve", () => {
			const result = cmd.deploy({ files: [makeFileParam({ topFolder: "/deploy/" })] });
			assert.strictEqual(result.alias, "d");
			const [params] = result.config[0];
			assert.ok(!params.includes("--fromRetrieve"), "should not include --fromRetrieve for deploy folder");
		});

		test("1 file from /retrieve/ — adds --fromRetrieve flag", () => {
			const result = cmd.deploy({ files: [makeFileParam({ topFolder: "/retrieve/" })] });
			assert.strictEqual(result.alias, "d");
			const [params] = result.config[0];
			assert.ok(params.includes("--fromRetrieve"), "expected --fromRetrieve for retrieve folder");
		});

		test("multiple files from /deploy/ — one config entry per credential group", () => {
			const result = cmd.deploy({
				files: [
					makeFileParam({ credential: "cred1/BU1", topFolder: "/deploy/" }),
					makeFileParam({ credential: "cred2/BU2", topFolder: "/deploy/" })
				]
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("multiple files from /retrieve/ — all get --fromRetrieve", () => {
			const result = cmd.deploy({
				files: [
					makeFileParam({ credential: "cred1/BU1", topFolder: "/retrieve/" }),
					makeFileParam({ credential: "cred2/BU2", topFolder: "/retrieve/" })
				]
			});
			assert.strictEqual(result.config.length, 2);
			result.config.forEach(([params]) => {
				assert.ok(params.includes("--fromRetrieve"), "expected --fromRetrieve for retrieve folder");
			});
		});

		test("type folder (no key) from /retrieve/ is filtered out — returns empty config", () => {
			const result = cmd.deploy({
				files: [makeFileParam({ topFolder: "/retrieve/", metadata: [makeFolderMetadata("email")] })]
			});
			assert.strictEqual(result.config.length, 0, "folder-level deploy from retrieve should be filtered");
		});

		test("type folder (no key) from /deploy/ is not filtered out", () => {
			const result = cmd.deploy({
				files: [makeFileParam({ topFolder: "/deploy/", metadata: [makeFolderMetadata("email")] })]
			});
			assert.strictEqual(
				result.config.length,
				1,
				"folder-level deploy from deploy folder should not be filtered"
			);
		});

		test("mixed: file + folder from /retrieve/ — only file entry survives", () => {
			const result = cmd.deploy({
				files: [
					makeFileParam({
						topFolder: "/retrieve/",
						metadata: [
							{ metadatatype: "email", key: "myEmail", path: "..." },
							makeFolderMetadata("automation")
						]
					})
				]
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected file-level email retained");
			assert.ok(!params.includes("-m automation"), "folder-level automation should be filtered");
			assert.ok(params.includes("--fromRetrieve"), "expected --fromRetrieve");
		});

		test("mix of /retrieve/ and /deploy/ files — retrieve gets --fromRetrieve, deploy does not", () => {
			const result = cmd.deploy({
				files: [
					makeFileParam({ credential: "cred1/BU1", topFolder: "/retrieve/" }),
					makeFileParam({ credential: "cred2/BU2", topFolder: "/deploy/" })
				]
			});
			assert.strictEqual(result.config.length, 2);
			const retrieveParams = result.config[0][0];
			const deployParams = result.config[1][0];
			assert.ok(retrieveParams.includes("--fromRetrieve"), "retrieve entry should have --fromRetrieve");
			assert.ok(!deployParams.includes("--fromRetrieve"), "deploy entry should not have --fromRetrieve");
		});

		test("BU-level selection from /deploy/ — credential is */* form", () => {
			const result = cmd.deploy({
				files: [makeFileParam({ topFolder: "/deploy/", credential: "myCred/*" })]
			});
			const [params] = result.config[0];
			assert.ok(params.startsWith("myCred/*"), "expected wildcard BU credential");
		});

		test("throws when 'files' property is missing", () => {
			assert.throws(() => cmd.deploy({}), /\[standard_deploy\]: The property 'files' is missing/);
		});
	});

	// ─── delete ───────────────────────────────────────────────────────────────

	suite("delete", () => {
		test("1 selected file — alias is 'del'", () => {
			const result = cmd.delete({ files: [makeFileParam()] });
			assert.strictEqual(result.alias, "del");
		});

		test("1 file in /retrieve/ — generates correct parameters", () => {
			const result = cmd.delete({ files: [makeFileParam()] });
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected metadata flag");
			assert.ok(params.includes('"myEmail"'), "expected key in metadata");
			assert.ok(params.includes("--y"), "expected skip interaction flag");
		});

		test("1 file in /deploy/ — works the same as in /retrieve/", () => {
			const result = cmd.delete({ files: [makeFileParam({ topFolder: "/deploy/" })] });
			assert.strictEqual(result.config.length, 1);
		});

		test("multiple selected files in /retrieve/ — one config entry per credential group", () => {
			const result = cmd.delete({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })]
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("multiple selected files in /deploy/ — one config entry per credential group", () => {
			const result = cmd.delete({
				files: [
					makeFileParam({ credential: "cred1/BU1", topFolder: "/deploy/" }),
					makeFileParam({ credential: "cred2/BU2", topFolder: "/deploy/" })
				]
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("1 selected type folder (mdt_folder) — uses empty key", () => {
			const result = cmd.delete({
				files: [makeFileParam({ metadata: [makeFolderMetadata("email")] })]
			});
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected email metadata");
			assert.ok(!params.includes(':"'), "folder delete should not include a key");
		});

		test("multiple type folders — included in config", () => {
			const result = cmd.delete({
				files: [
					makeFileParam({
						metadata: [makeFolderMetadata("email"), makeFolderMetadata("automation")]
					})
				]
			});
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected email metadata");
			assert.ok(params.includes("-m automation"), "expected automation metadata");
		});

		test("mix of file and type folder", () => {
			const result = cmd.delete({
				files: [
					makeFileParam({
						metadata: [
							{ metadatatype: "email", key: "myEmail", path: "..." },
							makeFolderMetadata("automation")
						]
					})
				]
			});
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected file-level email");
			assert.ok(params.includes("-m automation"), "expected folder automation");
		});

		test("throws when 'files' property is missing", () => {
			assert.throws(() => cmd.delete({}), /\[standard_delete\]: The property 'files' is missing/);
		});
	});

	// ─── changekey ────────────────────────────────────────────────────────────

	suite("changekey", () => {
		test("changeKeyField — alias is 'd' (runs as deploy)", () => {
			const result = cmd.changekey({ files: [makeFileParam()], changeKeyField: "name" });
			assert.strictEqual(result.alias, "d");
		});

		test("changeKeyField — adds --fromRetrieve, --skipValidation, --changeKeyField flags", () => {
			const result = cmd.changekey({ files: [makeFileParam()], changeKeyField: "name" });
			const [params] = result.config[0];
			assert.ok(params.includes("--fromRetrieve"), "expected --fromRetrieve");
			assert.ok(params.includes("--skipValidation"), "expected --skipValidation");
			assert.ok(params.includes('--changeKeyField "name"'), "expected --changeKeyField with value");
		});

		test("changeKeyValue — adds --changeKeyValue flag instead", () => {
			const result = cmd.changekey({ files: [makeFileParam()], changeKeyValue: "newKey" });
			const [params] = result.config[0];
			assert.ok(params.includes('--changeKeyValue "newKey"'), "expected --changeKeyValue with value");
			assert.ok(!params.includes("--changeKeyField"), "should not include --changeKeyField");
		});

		test("1 file in /retrieve/ — file is included", () => {
			const result = cmd.changekey({ files: [makeFileParam()], changeKeyField: "name" });
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected metadata with key");
		});

		test("type folder (no key) — gets filtered out, returns empty config", () => {
			const result = cmd.changekey({
				files: [makeFileParam({ metadata: [makeFolderMetadata("email")] })],
				changeKeyField: "name"
			});
			assert.strictEqual(result.config.length, 0, "folder-level changekey should be filtered out");
		});

		test("multiple files — one config entry per credential group", () => {
			const result = cmd.changekey({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })],
				changeKeyField: "name"
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("mix of file and folder — only file entries survive", () => {
			const result = cmd.changekey({
				files: [
					makeFileParam({
						metadata: [
							{ metadatatype: "email", key: "myEmail", path: "..." },
							makeFolderMetadata("automation")
						]
					})
				],
				changeKeyField: "name"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected file-level email retained");
			assert.ok(!params.includes("-m automation"), "folder-level automation should be filtered");
		});

		test("does not mutate the input parameter", () => {
			const inputParam = makeFileParam();
			const originalMetadataLength = inputParam.metadata.length;
			cmd.changekey({ files: [inputParam], changeKeyField: "name" });
			assert.strictEqual(inputParam.metadata.length, originalMetadataLength, "should not mutate input");
			assert.strictEqual(inputParam.optional, undefined, "should not mutate optional field on input");
		});

		test("throws when neither changeKeyField nor changeKeyValue is provided", () => {
			assert.throws(
				() => cmd.changekey({ files: [makeFileParam()] }),
				/\[standard_changekey\]: Either 'changeKeyField' or 'changeKeyValue' must be provided/
			);
		});

		test("throws when 'files' property is missing", () => {
			assert.throws(
				() => cmd.changekey({ changeKeyField: "name" }),
				/\[standard_changekey\]: The property 'files' is missing/
			);
		});
	});
});
