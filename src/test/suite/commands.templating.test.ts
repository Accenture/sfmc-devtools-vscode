import * as assert from "assert";
import TemplatingCommands from "../../devtools/commands/templating";
import { TDevTools } from "@types";

/**
 * Helper to build a minimal ICommandFileParameters for clone/copytobu testing.
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
 * Helper to build a folder-level metadata entry (no key).
 */
function makeFolderMetadata(metadatatype: string): TDevTools.IMetadataCommand {
	return { metadatatype, key: "", path: `/project/retrieve/myCred/myBU/${metadatatype}` };
}

/**
 * Tests for TemplatingCommands.clone() (used by the "Copy to BU" command)
 *
 * Each clone invocation is tested for:
 * - 1 selected file
 * - multiple selected files
 * - 1 selected type folder (mdt_folder)
 * - multiple selected type folders
 * - mixed file and folder selections
 * - multiple BU targets
 */
suite("TemplatingCommands (clone / Copy to BU)", () => {
	let cmd: TemplatingCommands;

	setup(() => {
		cmd = new TemplatingCommands();
	});

	// ─── commandsList ──────────────────────────────────────────────────────────

	test("commandsList includes clone", () => {
		const list = cmd.commandsList();
		assert.ok(list.includes("clone"), "missing clone");
	});

	// ─── clone – alias and flags ───────────────────────────────────────────────

	suite("clone — 1 selected file", () => {
		test("alias is 'clone'", () => {
			const result = cmd.clone({ files: [makeFileParam()], targetBusinessUnit: "myCred/targetBU" });
			assert.strictEqual(result.alias, "clone");
		});

		test("adds --bf (buFrom) and --bt (buTarget) flags", () => {
			const result = cmd.clone({ files: [makeFileParam()], targetBusinessUnit: "myCred/targetBU" });
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("--bf myCred/myBU"), "expected --bf with source BU");
			assert.ok(params.includes("--bt myCred/targetBU"), "expected --bt with target BU");
		});

		test("adds --no-purge and --skipValidation flags", () => {
			const result = cmd.clone({ files: [makeFileParam()], targetBusinessUnit: "myCred/targetBU" });
			const [params] = result.config[0];
			assert.ok(params.includes("--no-purge"), "expected --no-purge flag");
			assert.ok(params.includes("--skipValidation"), "expected --skipValidation flag");
		});

		test("includes metadata with correct key", () => {
			const result = cmd.clone({ files: [makeFileParam()], targetBusinessUnit: "myCred/targetBU" });
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected email metadata");
			assert.ok(params.includes('"myEmail"'), "expected key in metadata");
		});

		test("file in /retrieve/ — works correctly", () => {
			const result = cmd.clone({
				files: [makeFileParam({ topFolder: "/retrieve/" })],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
		});
	});

	// ─── clone – multiple files ────────────────────────────────────────────────

	suite("clone — multiple selected files", () => {
		test("returns one config entry per credential group", () => {
			const result = cmd.clone({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })],
				targetBusinessUnit: "cred1/targetBU"
			});
			assert.strictEqual(result.config.length, 2);
		});

		test("each entry has --bf with its own source credential", () => {
			const result = cmd.clone({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })],
				targetBusinessUnit: "targetCred/targetBU"
			});
			const [params1] = result.config[0];
			const [params2] = result.config[1];
			assert.ok(params1.includes("--bf cred1/BU1"), "expected source BU 1");
			assert.ok(params2.includes("--bf cred2/BU2"), "expected source BU 2");
		});

		test("all entries share the same --bt target", () => {
			const result = cmd.clone({
				files: [makeFileParam({ credential: "cred1/BU1" }), makeFileParam({ credential: "cred2/BU2" })],
				targetBusinessUnit: "targetCred/targetBU"
			});
			result.config.forEach(([params]) => {
				assert.ok(params.includes("--bt targetCred/targetBU"), "expected same target BU for all entries");
			});
		});

		test("multiple files from same BU — combined into single credential-group parameters", () => {
			const result = cmd.clone({
				files: [
					makeFileParam({
						credential: "myCred/myBU",
						metadata: [
							{ metadatatype: "email", key: "email1", path: "..." },
							{ metadatatype: "email", key: "email2", path: "..." }
						]
					})
				],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected email metadata");
		});
	});

	// ─── clone – type folders (mdt_folder) ────────────────────────────────────

	suite("clone — 1 selected type folder", () => {
		test("works with folder-level metadata (empty key)", () => {
			const result = cmd.clone({
				files: [makeFileParam({ metadata: [makeFolderMetadata("email")] })],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected email metadata");
			assert.ok(!params.includes(':"'), "folder-level should not include a key");
		});

		test("includes --bf and --bt even for folder selection", () => {
			const result = cmd.clone({
				files: [makeFileParam({ metadata: [makeFolderMetadata("automation")] })],
				targetBusinessUnit: "myCred/targetBU"
			});
			const [params] = result.config[0];
			assert.ok(params.includes("--bf"), "expected --bf flag");
			assert.ok(params.includes("--bt"), "expected --bt flag");
		});
	});

	suite("clone — multiple selected type folders", () => {
		test("multiple type folders in same BU — combined in one credential group", () => {
			const result = cmd.clone({
				files: [
					makeFileParam({
						metadata: [makeFolderMetadata("email"), makeFolderMetadata("automation")]
					})
				],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email"), "expected email metadata");
			assert.ok(params.includes("-m automation"), "expected automation metadata");
		});

		test("type folders from different BUs — separate credential group entries", () => {
			const result = cmd.clone({
				files: [
					makeFileParam({ credential: "myCred/BU1", metadata: [makeFolderMetadata("email")] }),
					makeFileParam({ credential: "myCred/BU2", metadata: [makeFolderMetadata("email")] })
				],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 2);
		});
	});

	// ─── clone – BU folder selections ────────────────────────────────────────

	suite("clone — 1 selected BU folder", () => {
		test("works with wildcard BU credential", () => {
			const result = cmd.clone({
				files: [makeFileParam({ credential: "myCred/*" })],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("--bf myCred/*"), "expected wildcard --bf");
		});
	});

	suite("clone — multiple selected BU folders", () => {
		test("each BU gets its own credential-group entry", () => {
			const result = cmd.clone({
				files: [makeFileParam({ credential: "myCred/BU1" }), makeFileParam({ credential: "myCred/BU2" })],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 2);
			assert.ok(result.config[0][0].includes("--bf myCred/BU1"), "expected --bf BU1");
			assert.ok(result.config[1][0].includes("--bf myCred/BU2"), "expected --bf BU2");
		});
	});

	// ─── clone – mixed selections ─────────────────────────────────────────────

	suite("clone — mixed file and folder selections", () => {
		test("mix of file and type folder in same BU", () => {
			const result = cmd.clone({
				files: [
					makeFileParam({
						metadata: [
							{ metadatatype: "email", key: "myEmail", path: "..." },
							makeFolderMetadata("automation")
						]
					})
				],
				targetBusinessUnit: "myCred/targetBU"
			});
			assert.strictEqual(result.config.length, 1);
			const [params] = result.config[0];
			assert.ok(params.includes("-m email:"), "expected file email entry");
			assert.ok(params.includes("-m automation"), "expected folder automation entry");
		});
	});

	// ─── clone – error cases ──────────────────────────────────────────────────

	suite("clone — error cases", () => {
		test("throws when 'files' property is missing", () => {
			assert.throws(
				() => cmd.clone({ targetBusinessUnit: "myCred/targetBU" }),
				/\[templating_clone\]: The property 'files' is missing/
			);
		});

		test("throws when 'targetBusinessUnit' property is missing", () => {
			assert.throws(
				() => cmd.clone({ files: [makeFileParam()] }),
				/\[templating_clone\]: The property 'targetBusinessUnit' is missing/
			);
		});
	});

	// ─── does not mutate input ─────────────────────────────────────────────────

	test("does not mutate the input file parameters", () => {
		const fileParam = makeFileParam();
		const originalOptional = fileParam.optional;
		cmd.clone({ files: [fileParam], targetBusinessUnit: "myCred/targetBU" });
		assert.strictEqual(fileParam.optional, originalOptional, "should not mutate optional on input");
	});

	// ─── run() dispatch ────────────────────────────────────────────────────────

	suite("run() dispatch", () => {
		test("run('clone', ...) dispatches to clone() and returns alias 'clone'", () => {
			const result = cmd.run("clone", { files: [makeFileParam()], targetBusinessUnit: "myCred/targetBU" });
			assert.strictEqual(result.alias, "clone");
			assert.strictEqual(result.config.length, 1);
		});

		test("run(unknown command) returns empty config", () => {
			const result = cmd.run("unknown" as "clone", {});
			assert.strictEqual(result.alias, "");
			assert.deepStrictEqual(result.config, []);
		});
	});
});
