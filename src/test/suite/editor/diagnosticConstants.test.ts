import * as assert from "assert";
import { DIAGNOSTIC_CODE } from "../../../editor/contentBlockDiagnosticProvider";
import { DIAGNOSTIC_CODE_SQL, DATA_VIEWS } from "../../../editor/sqlDiagnosticProvider";
import { DIAGNOSTIC_CODE_SCRIPT } from "../../../editor/scriptDiagnosticProvider";
import { DIAGNOSTIC_SOURCE } from "../../../editor/relatedItemDiagnosticProvider";
import { RETRIEVE_CONTENT_BLOCK_COMMAND } from "../../../editor/contentBlockCodeActionProvider";
import { RETRIEVE_SQL_DE_COMMAND } from "../../../editor/sqlCodeActionProvider";
import { RETRIEVE_SCRIPT_DE_COMMAND } from "../../../editor/scriptCodeActionProvider";
import { RETRIEVE_RELATED_ITEM_COMMAND } from "../../../editor/relatedItemCodeActionProvider";
import { ASSET_CACHE_GLOB } from "../../../editor/contentBlockLinkProvider";

suite("Diagnostic and Command constants", () => {
	suite("diagnostic codes", () => {
		test("ContentBlock diagnostic code is correct", () => {
			assert.strictEqual(DIAGNOSTIC_CODE, "warnOnContentBlockByKey");
		});

		test("SQL diagnostic code is correct", () => {
			assert.strictEqual(DIAGNOSTIC_CODE_SQL, "warnOnMissingSqlDataExtension");
		});

		test("Script diagnostic code is correct", () => {
			assert.strictEqual(DIAGNOSTIC_CODE_SCRIPT, "warnOnMissingScriptDataExtension");
		});

		test("diagnostic source matches extension name", () => {
			assert.strictEqual(DIAGNOSTIC_SOURCE, "sfmc-devtools-vscode");
		});
	});

	suite("quick-fix command IDs", () => {
		test("ContentBlock retrieve command uses correct prefix", () => {
			assert.strictEqual(RETRIEVE_CONTENT_BLOCK_COMMAND, "sfmc-devtools-vscode.retrieveContentBlock");
		});

		test("SQL retrieve command uses correct prefix", () => {
			assert.strictEqual(RETRIEVE_SQL_DE_COMMAND, "sfmc-devtools-vscode.retrieveSqlDataExtension");
		});

		test("Script retrieve command uses correct prefix", () => {
			assert.strictEqual(RETRIEVE_SCRIPT_DE_COMMAND, "sfmc-devtools-vscode.retrieveScriptDataExtension");
		});

		test("Related item retrieve command uses correct prefix", () => {
			assert.strictEqual(RETRIEVE_RELATED_ITEM_COMMAND, "sfmc-devtools-vscode.retrieveRelatedItem");
		});

		test("all commands share the same extension prefix", () => {
			const prefix = "sfmc-devtools-vscode.";
			assert.ok(RETRIEVE_CONTENT_BLOCK_COMMAND.startsWith(prefix));
			assert.ok(RETRIEVE_SQL_DE_COMMAND.startsWith(prefix));
			assert.ok(RETRIEVE_SCRIPT_DE_COMMAND.startsWith(prefix));
			assert.ok(RETRIEVE_RELATED_ITEM_COMMAND.startsWith(prefix));
		});
	});

	suite("asset cache glob pattern", () => {
		test("ASSET_CACHE_GLOB matches expected pattern", () => {
			assert.strictEqual(ASSET_CACHE_GLOB, "retrieve/*/*/asset/{other,block}/*.asset-*-meta.*");
		});

		test("ASSET_CACHE_GLOB targets retrieve/ only (not deploy/)", () => {
			assert.ok(ASSET_CACHE_GLOB.startsWith("retrieve/"));
		});
	});
});

suite("SQL data view hover integration", () => {
	/**
	 * Simulate the hover provider logic: match SQL DE regex and check
	 * whether the matched name is a known data view.
	 */
	const SQL_DE_REGEX =
		/\b(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+(?:(ENT)\s*\.\s*)?(?:\[([^\]]+)\]|([A-Za-z_]\w*))/gi;
	const SQL_FROM_JOIN_PREFIX_REGEX = /^(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+/i;

	interface HoverResult {
		name: string;
		description: string;
		level: string;
		rangeStart: number;
		rangeEnd: number;
	}

	function simulateHover(text: string, cursorOffset: number): HoverResult | undefined {
		const regex = new RegExp(SQL_DE_REGEX.source, "gi");
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			const hasEntPrefix = match[1] !== undefined;
			const name = match[2] ?? match[3];
			if (!name) continue;
			const lowerName = name.toLowerCase();
			const description = DATA_VIEWS.get(lowerName);
			if (!description) continue;

			const fromJoinLen = match[0].match(SQL_FROM_JOIN_PREFIX_REGEX)?.[0].length ?? 0;
			const rangeStart = match.index + fromJoinLen;
			const rangeEnd = match.index + match[0].length;

			if (cursorOffset >= rangeStart && cursorOffset <= rangeEnd) {
				const level = hasEntPrefix ? "At Enterprise level" : "At child BU level";
				return { name, description, level, rangeStart, rangeEnd };
			}
		}
		return undefined;
	}

	test("hover on _Sent shows description", () => {
		const text = "SELECT * FROM _Sent";
		// Cursor on "_Sent" (offset ~14)
		const result = simulateHover(text, 14);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Sent");
		assert.ok(result!.description.length > 0);
		assert.strictEqual(result!.level, "At child BU level");
	});

	test("hover on ENT._Sent shows Enterprise level", () => {
		const text = "SELECT * FROM ENT._Sent";
		// Cursor on "ENT._Sent" area
		const result = simulateHover(text, 18);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Sent");
		assert.strictEqual(result!.level, "At Enterprise level");
	});

	test("hover on _Open in JOIN clause", () => {
		const text = "SELECT * FROM A JOIN _Open ON 1=1";
		// Cursor on "_Open"
		const result = simulateHover(text, 22);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Open");
	});

	test("hover on _Bounce in LEFT JOIN", () => {
		const text = "SELECT * FROM A LEFT JOIN _Bounce ON 1=1";
		// Cursor on "_Bounce"
		const result = simulateHover(text, 28);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Bounce");
	});

	test("no hover for user-defined DE", () => {
		const text = "SELECT * FROM MyCustomDE";
		const result = simulateHover(text, 16);
		assert.strictEqual(result, undefined);
	});

	test("no hover when cursor is outside match range", () => {
		const text = "SELECT * FROM _Sent WHERE 1=1";
		// Cursor on "WHERE" (offset ~20)
		const result = simulateHover(text, 25);
		assert.strictEqual(result, undefined);
	});

	test("hover on _Subscribers in complex query", () => {
		const sql = ["SELECT s.*, j.*", "FROM _Subscribers s", "INNER JOIN _Journey j ON s.id = j.sid"].join("\n");
		// Cursor on "_Subscribers" in line 2
		const subIdx = sql.indexOf("_Subscribers");
		const result = simulateHover(sql, subIdx);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Subscribers");
	});

	test("hover on _Journey in INNER JOIN", () => {
		const sql = ["SELECT s.*, j.*", "FROM _Subscribers s", "INNER JOIN _Journey j ON s.id = j.sid"].join("\n");
		const jIdx = sql.indexOf("_Journey");
		const result = simulateHover(sql, jIdx);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Journey");
	});

	test("hover on bracketed data view", () => {
		const text = "SELECT * FROM [_Sent]";
		const sentIdx = text.indexOf("[_Sent]");
		const result = simulateHover(text, sentIdx + 1);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Sent");
	});

	test("hover on ENT-prefixed bracketed data view", () => {
		const text = "SELECT * FROM ENT.[_Click]";
		const clickIdx = text.indexOf("[_Click]");
		const result = simulateHover(text, clickIdx);
		assert.ok(result);
		assert.strictEqual(result!.name, "_Click");
		assert.strictEqual(result!.level, "At Enterprise level");
	});
});
