import * as assert from "assert";
import StandardCommands from "../../../devtools/commands/standard";
import { MAX_CMD_LENGTH } from "../../../devtools/commands/commands";
import { TDevTools } from "@types";

/**
 * Helper to build an ICommandFileParameters with a given number of metadata items.
 *
 * @param count - how many metadata items to generate
 * @param keyLength - length of each individual key string (default 30)
 */
function makeParameters(count: number, keyLength = 30): TDevTools.ICommandFileParameters {
	const metadata: TDevTools.IMetadataCommand[] = Array.from({ length: count }, (_, i) => ({
		metadatatype: "dataExtension",
		key: "k".repeat(Math.max(0, keyLength - String(i).length)) + i,
		path: "/retrieve/cred/bu/dataExtension"
	}));
	return {
		credential: "cred/bu",
		projectPath: "/project",
		topFolder: "/retrieve/",
		metadata
	};
}

suite("StandardCommands – delete", () => {
	let cmd: StandardCommands;

	setup(() => {
		cmd = new StandardCommands();
	});

	test("delete returns a config entry for each file parameter", () => {
		const param = makeParameters(2);
		const result = cmd.delete({ files: [param] });

		assert.strictEqual(result.alias, "del");
		// With only 2 short items there should be a single config entry
		assert.strictEqual(result.config.length, 1);
	});

	test("delete throws when 'files' property is missing", () => {
		assert.throws(() => cmd.delete({}), /\[standard_delete\]: The property 'files' is missing from parameters\./);
	});

	test("delete with small number of items produces one config entry", () => {
		const param = makeParameters(5);
		const result = cmd.delete({ files: [param] });

		assert.strictEqual(result.alias, "del");
		assert.strictEqual(result.config.length, 1);
	});

	test("delete splits into multiple chunks when command line would exceed MAX_CMD_LENGTH", () => {
		// Use a large key length so that many items quickly exceed the limit.
		// Each metadata item string is roughly: " -m dataExtension:\"<key>\"" ~= 25 + keyLength chars.
		// With keyLength=200 and count=50 the total parameters string is well over 8000 chars.
		const param = makeParameters(50, 200);
		const result = cmd.delete({ files: [param] });

		assert.strictEqual(result.alias, "del");
		// Must have produced more than one chunk
		assert.ok(result.config.length > 1, `Expected multiple chunks, got ${result.config.length}`);
	});

	test("each chunk's command string does not exceed MAX_CMD_LENGTH", () => {
		const param = makeParameters(50, 200);
		const result = cmd.delete({ files: [param] });

		for (const [paramStr] of result.config) {
			assert.ok(
				paramStr.length <= MAX_CMD_LENGTH,
				`Chunk length ${paramStr.length} exceeds MAX_CMD_LENGTH (${MAX_CMD_LENGTH})`
			);
		}
	});

	test("all metadata items are preserved across chunks", () => {
		const count = 50;
		const param = makeParameters(count, 200);
		const result = cmd.delete({ files: [param] });

		// Collect all -m arguments from all chunks
		const allKeys: string[] = [];
		for (const [paramStr] of result.config) {
			const matches = paramStr.matchAll(/-m dataExtension:"([^"]+)"/g);
			for (const m of matches) {
				allKeys.push(m[1]);
			}
		}

		assert.strictEqual(allKeys.length, count, "Total metadata items across all chunks must equal original count");
	});

	test("delete with two credentials produces separate config entries", () => {
		const param1 = makeParameters(2);
		const param2: TDevTools.ICommandFileParameters = {
			credential: "cred2/bu2",
			projectPath: "/project2",
			topFolder: "/retrieve/",
			metadata: [{ metadatatype: "query", key: "myQuery", path: "/retrieve/cred2/bu2/query" }]
		};
		const result = cmd.delete({ files: [param1, param2] });

		assert.strictEqual(result.alias, "del");
		// At minimum one entry per credential
		assert.ok(result.config.length >= 2);
	});

	test("delete sets preRunInfo when command is split into multiple chunks", () => {
		const param = makeParameters(50, 200);
		const result = cmd.delete({ files: [param] });

		// Chunking must have occurred
		assert.ok(result.config.length > 1);
		// preRunInfo must be set and mention the number of runs
		assert.ok(result.preRunInfo, "preRunInfo should be set when chunking occurs");
		assert.ok(
			result.preRunInfo?.includes(String(result.config.length)),
			`preRunInfo should mention the total number of runs (${result.config.length})`
		);
	});

	test("delete does not set preRunInfo when no chunking is needed", () => {
		const param = makeParameters(2);
		const result = cmd.delete({ files: [param] });

		assert.strictEqual(result.config.length, 1);
		assert.strictEqual(result.preRunInfo, undefined);
	});
});
