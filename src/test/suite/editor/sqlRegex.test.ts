import * as assert from "assert";

/**
 * SQL DE regex tests for FROM/JOIN clauses.
 *
 * Tests the regex exported by dataExtensionLinkProvider.ts that matches
 * FROM / JOIN clauses with an optional ENT. prefix.
 */
const SQL_DE_REGEX =
	/\b(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+(?:(ENT)\s*\.\s*)?(?:\[([^\]]+)\]|([A-Za-z_]\w*))/gi;

const SQL_FROM_JOIN_PREFIX_REGEX = /^(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+/i;

interface SqlDeMatch {
	hasEntPrefix: boolean;
	name: string;
	full: string;
}

function collectSqlDeMatches(text: string): SqlDeMatch[] {
	const matches: SqlDeMatch[] = [];
	const regex = new RegExp(SQL_DE_REGEX.source, "gi");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({
			hasEntPrefix: match[1] !== undefined,
			name: match[2] ?? match[3],
			full: match[0]
		});
	}
	return matches;
}

suite("SQL – SQL_DE_REGEX", () => {
	suite("FROM clause", () => {
		test("matches bare identifier after FROM", () => {
			const matches = collectSqlDeMatches("SELECT * FROM MyDataExtension");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDataExtension");
			assert.strictEqual(matches[0].hasEntPrefix, false);
		});

		test("matches bracketed name after FROM", () => {
			const matches = collectSqlDeMatches("SELECT * FROM [My Data Extension]");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "My Data Extension");
		});

		test("matches FROM with ENT prefix (bare)", () => {
			const matches = collectSqlDeMatches("SELECT * FROM ENT.MyDE");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});

		test("matches FROM with ENT prefix (bracketed)", () => {
			const matches = collectSqlDeMatches("SELECT * FROM ENT.[My Shared DE]");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "My Shared DE");
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});

		test("matches case-insensitive FROM", () => {
			const matches = collectSqlDeMatches("SELECT * from MyDE");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches case-insensitive ent prefix", () => {
			const matches = collectSqlDeMatches("SELECT * FROM ent.MyDE");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});
	});

	suite("JOIN variants", () => {
		test("matches plain JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A JOIN MyDE ON A.id = MyDE.id");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "MyDE");
		});

		test("matches INNER JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A INNER JOIN [My DE] ON A.id = b.id");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "My DE");
		});

		test("matches LEFT JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A LEFT JOIN BTable ON A.id = BTable.id");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "BTable");
		});

		test("matches RIGHT JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A RIGHT JOIN [Right Table] ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "Right Table");
		});

		test("matches CROSS JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A CROSS JOIN BTable");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "BTable");
		});

		test("matches FULL JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A FULL JOIN BTable ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "BTable");
		});

		test("matches LEFT OUTER JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A LEFT OUTER JOIN [Shared DE] ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "Shared DE");
		});

		test("matches RIGHT OUTER JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A RIGHT OUTER JOIN RightDE ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "RightDE");
		});

		test("matches FULL OUTER JOIN", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A FULL OUTER JOIN FullDE ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "FullDE");
		});

		test("matches JOIN with ENT prefix", () => {
			const matches = collectSqlDeMatches("SELECT * FROM A INNER JOIN ENT.[Shared Table] ON 1=1");
			assert.strictEqual(matches.length, 2);
			assert.strictEqual(matches[1].name, "Shared Table");
			assert.strictEqual(matches[1].hasEntPrefix, true);
		});
	});

	suite("multi-table queries", () => {
		test("finds all tables in complex query", () => {
			const sql = [
				"SELECT a.*, b.*, c.*",
				"FROM [Primary Table]",
				"INNER JOIN ENT.[Shared Table] ON a.id = b.id",
				"LEFT JOIN LocalDE ON b.fk = c.pk"
			].join("\n");
			const matches = collectSqlDeMatches(sql);
			assert.strictEqual(matches.length, 3);
			assert.strictEqual(matches[0].name, "Primary Table");
			assert.strictEqual(matches[0].hasEntPrefix, false);
			assert.strictEqual(matches[1].name, "Shared Table");
			assert.strictEqual(matches[1].hasEntPrefix, true);
			assert.strictEqual(matches[2].name, "LocalDE");
			assert.strictEqual(matches[2].hasEntPrefix, false);
		});
	});

	suite("identifiers with underscores", () => {
		test("matches identifier starting with underscore", () => {
			const matches = collectSqlDeMatches("SELECT * FROM _Sent");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "_Sent");
		});

		test("matches identifier with numbers", () => {
			const matches = collectSqlDeMatches("SELECT * FROM My_DE_2024");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "My_DE_2024");
		});
	});

	suite("non-matching inputs", () => {
		test("does not match SELECT clause", () => {
			const matches = collectSqlDeMatches("SELECT MyColumn FROM MyDE");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("does not match WHERE clause", () => {
			const matches = collectSqlDeMatches("SELECT * FROM MyDE WHERE x = 1");
			assert.strictEqual(matches.length, 1);
		});
	});
});

suite("SQL – SQL_FROM_JOIN_PREFIX_REGEX", () => {
	test("extracts FROM prefix", () => {
		const match = "FROM MyDE".match(SQL_FROM_JOIN_PREFIX_REGEX);
		assert.ok(match);
		assert.strictEqual(match![0], "FROM ");
	});

	test("extracts LEFT JOIN prefix", () => {
		const match = "LEFT JOIN MyDE".match(SQL_FROM_JOIN_PREFIX_REGEX);
		assert.ok(match);
		assert.strictEqual(match![0], "LEFT JOIN ");
	});

	test("extracts INNER JOIN prefix", () => {
		const match = "INNER JOIN [My DE]".match(SQL_FROM_JOIN_PREFIX_REGEX);
		assert.ok(match);
		assert.strictEqual(match![0], "INNER JOIN ");
	});

	test("extracts LEFT OUTER JOIN prefix", () => {
		const match = "LEFT OUTER JOIN MyDE".match(SQL_FROM_JOIN_PREFIX_REGEX);
		assert.ok(match);
		assert.strictEqual(match![0], "LEFT OUTER JOIN ");
	});

	test("extracts FULL OUTER JOIN prefix", () => {
		const match = "FULL OUTER JOIN [DE]".match(SQL_FROM_JOIN_PREFIX_REGEX);
		assert.ok(match);
		assert.strictEqual(match![0], "FULL OUTER JOIN ");
	});
});

suite("SQL – SUPPORTED_SQL_FILE_REGEX", () => {
	const SUPPORTED_SQL_FILE_REGEX = /\/retrieve\/[^/]+\/[^/]+\/query\//;

	test("matches retrieve/cred/bu/query/ path", () => {
		assert.ok(SUPPORTED_SQL_FILE_REGEX.test("/workspace/retrieve/myOrg/myBU/query/myQuery.query-meta.sql"));
	});

	test("does not match deploy path", () => {
		assert.ok(!SUPPORTED_SQL_FILE_REGEX.test("/workspace/deploy/myOrg/myBU/query/myQuery.sql"));
	});

	test("does not match other type folders", () => {
		assert.ok(!SUPPORTED_SQL_FILE_REGEX.test("/workspace/retrieve/myOrg/myBU/dataExtension/de.sql"));
	});

	test("does not match missing BU segment", () => {
		assert.ok(!SUPPORTED_SQL_FILE_REGEX.test("/workspace/retrieve/myOrg/query/myQuery.sql"));
	});
});
