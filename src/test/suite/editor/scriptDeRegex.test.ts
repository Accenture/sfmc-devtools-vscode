import * as assert from "assert";

/**
 * Tests for the SCRIPT_DE_REGEX and PROXY_DE_REGEX patterns used by
 * scriptDataExtensionLinkProvider.ts and scriptDiagnosticProvider.ts.
 *
 * These match SSJS / AMPscript function calls whose first argument is a DE name.
 */
const SCRIPT_DE_REGEX =
	/(?:\bPlatform\s*\.\s*Function\s*\.\s*|\b(?<!\.))(?:ClaimRow(?:Value)?|DataExtension\s*\.\s*Init|DataExtensionRowCount|Delete(?:Data|DE)|Insert(?:Data|DE)|Lookup(?:OrderedRows(?:CS)?|Rows(?:CS)?)?|Update(?:Data|DE)|Upsert(?:Data|DE))\s*\(\s*\\?["'](?:(ENT)\s*\.\s*)?([^"'\\]+)\\?["']/gi;

const PROXY_DE_REGEX =
	/\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*\.\s*retrieve\s*\(\s*\\?["']DataExtensionObject\[([^\]"']+)\]\\?["']/gi;

interface ScriptDeMatch {
	hasEntPrefix: boolean;
	name: string;
}

function collectScriptDeMatches(text: string): ScriptDeMatch[] {
	const matches: ScriptDeMatch[] = [];
	const regex = new RegExp(SCRIPT_DE_REGEX.source, "gi");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({ hasEntPrefix: match[1] !== undefined, name: match[2] });
	}
	return matches;
}

function collectProxyMatches(text: string): string[] {
	const names: string[] = [];
	const regex = new RegExp(PROXY_DE_REGEX.source, "gi");
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		names.push(match[1]);
	}
	return names;
}

suite("Script DE – SCRIPT_DE_REGEX", () => {
	suite("Lookup family", () => {
		test("matches Lookup with double quotes", () => {
			const matches = collectScriptDeMatches('Lookup("MyDE", "Column", "Key", value)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
			assert.strictEqual(matches[0].hasEntPrefix, false);
		});

		test("matches Lookup with single quotes", () => {
			const matches = collectScriptDeMatches("Lookup('MyDE', 'Column', 'Key', value)");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches LookupRows", () => {
			const matches = collectScriptDeMatches("LookupRows('My Data Extension', 'Col', val)");
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "My Data Extension");
		});

		test("matches LookupRowsCS", () => {
			const matches = collectScriptDeMatches('LookupRowsCS("MyDE", "Col", "Val")');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches LookupOrderedRows", () => {
			const matches = collectScriptDeMatches('LookupOrderedRows("MyDE", 10, "Col ASC", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches LookupOrderedRowsCS", () => {
			const matches = collectScriptDeMatches('LookupOrderedRowsCS("MyDE", 10, "Col ASC")');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});
	});

	suite("Insert/Update/Upsert/Delete family", () => {
		test("matches InsertData", () => {
			const matches = collectScriptDeMatches('InsertData("MyDE", "Col", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches InsertDE", () => {
			const matches = collectScriptDeMatches('InsertDE("MyDE", "Col", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches UpdateData", () => {
			const matches = collectScriptDeMatches('UpdateData("MyDE", "Key", val, "Col", newVal)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches UpdateDE", () => {
			const matches = collectScriptDeMatches('UpdateDE("MyDE", ["Col"], [val])');
			assert.strictEqual(matches.length, 1);
		});

		test("matches UpsertData", () => {
			const matches = collectScriptDeMatches('UpsertData("MyDE", 1, "Key", val, "Col", newVal)');
			assert.strictEqual(matches.length, 1);
		});

		test("matches UpsertDE", () => {
			const matches = collectScriptDeMatches('UpsertDE("MyDE", ["Col"], [val])');
			assert.strictEqual(matches.length, 1);
		});

		test("matches DeleteData", () => {
			const matches = collectScriptDeMatches('DeleteData("MyDE", "Key", val)');
			assert.strictEqual(matches.length, 1);
		});

		test("matches DeleteDE", () => {
			const matches = collectScriptDeMatches('DeleteDE("MyDE", "Key", val)');
			assert.strictEqual(matches.length, 1);
		});
	});

	suite("other functions", () => {
		test("matches ClaimRow", () => {
			const matches = collectScriptDeMatches('ClaimRow("MyDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches ClaimRowValue", () => {
			const matches = collectScriptDeMatches('ClaimRowValue("MyDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
		});

		test("matches DataExtension.Init", () => {
			const matches = collectScriptDeMatches('DataExtension.Init("MyDE")');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches DataExtensionRowCount", () => {
			const matches = collectScriptDeMatches('DataExtensionRowCount("MyDE")');
			assert.strictEqual(matches.length, 1);
		});
	});

	suite("Platform.Function prefix", () => {
		test("matches Platform.Function.Lookup", () => {
			const matches = collectScriptDeMatches('Platform.Function.Lookup("MyDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});

		test("matches Platform.Function.InsertData", () => {
			const matches = collectScriptDeMatches('Platform.Function.InsertData("MyDE", "Col", val)');
			assert.strictEqual(matches.length, 1);
		});

		test("matches lowercase platform.function.lookup", () => {
			const matches = collectScriptDeMatches('platform.function.lookup("MyDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
		});

		test("matches with spaces around dots", () => {
			const matches = collectScriptDeMatches('Platform . Function . Lookup("MyDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
		});
	});

	suite("ENT prefix", () => {
		test("matches ENT-prefixed DE name", () => {
			const matches = collectScriptDeMatches('Lookup("ENT.SharedDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "SharedDE");
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});

		test("matches ent-prefixed (case insensitive) DE name", () => {
			const matches = collectScriptDeMatches('Lookup("ent.SharedDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});

		test("matches ENT with spaces around dot", () => {
			const matches = collectScriptDeMatches('Lookup("ENT . SharedDE", "Col", "Key", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].hasEntPrefix, true);
		});
	});

	suite("false-positive exclusions", () => {
		test("does NOT match Rows.Lookup (method on object)", () => {
			const matches = collectScriptDeMatches('Rows.Lookup("Purpose", purpose)');
			assert.strictEqual(matches.length, 0);
		});

		test("does NOT match result.Lookup (method on arbitrary object)", () => {
			const matches = collectScriptDeMatches('result.Lookup("Field", value)');
			assert.strictEqual(matches.length, 0);
		});

		test("does NOT match someVar.InsertData (method on arbitrary object)", () => {
			const matches = collectScriptDeMatches('myObj.InsertData("MyDE", "Col", val)');
			assert.strictEqual(matches.length, 0);
		});
	});

	suite("multi-line calls", () => {
		test("matches function call spanning multiple lines", () => {
			const text = 'LookupRows(\n      "My DE",\n      "Col", val)';
			const matches = collectScriptDeMatches(text);
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "My DE");
		});
	});

	suite("JSON-escaped quotes", () => {
		test('matches Lookup(\\"MyDE\\")', () => {
			const matches = collectScriptDeMatches('Lookup(\\"MyDE\\", \\"Col\\", \\"Key\\", val)');
			assert.strictEqual(matches.length, 1);
			assert.strictEqual(matches[0].name, "MyDE");
		});
	});

	suite("multiple matches in one file", () => {
		test("finds all DE references in SSJS script", () => {
			const text = [
				'var rows = LookupRows("DE_One", "Col", val);',
				'InsertData("DE_Two", "Col", val);',
				'Platform.Function.DeleteData("DE_Three", "Key", val);'
			].join("\n");
			const matches = collectScriptDeMatches(text);
			assert.strictEqual(matches.length, 3);
			assert.strictEqual(matches[0].name, "DE_One");
			assert.strictEqual(matches[1].name, "DE_Two");
			assert.strictEqual(matches[2].name, "DE_Three");
		});
	});
});

suite("Script DE – PROXY_DE_REGEX", () => {
	test("matches proxy.retrieve with DataExtensionObject", () => {
		const names = collectProxyMatches("proxy.retrieve('DataExtensionObject[My DE]', cols, filter)");
		assert.deepStrictEqual(names, ["My DE"]);
	});

	test("matches with double quotes", () => {
		const names = collectProxyMatches('ws_proxy.retrieve("DataExtensionObject[API_Credentials]", cols)');
		assert.deepStrictEqual(names, ["API_Credentials"]);
	});

	test("matches with arbitrary variable names", () => {
		const names = collectProxyMatches("myVar.retrieve('DataExtensionObject[TestDE]', cols)");
		assert.deepStrictEqual(names, ["TestDE"]);
	});

	test("matches variable name starting with underscore", () => {
		const names = collectProxyMatches("_proxy.retrieve('DataExtensionObject[MyDE]', cols)");
		assert.deepStrictEqual(names, ["MyDE"]);
	});

	test("matches variable name starting with dollar", () => {
		const names = collectProxyMatches("$proxy.retrieve('DataExtensionObject[MyDE]', cols)");
		assert.deepStrictEqual(names, ["MyDE"]);
	});

	test("matches multi-line retrieve call", () => {
		const text = "proxy.retrieve(\n      'DataExtensionObject[My DE]',\n      cols)";
		const names = collectProxyMatches(text);
		assert.deepStrictEqual(names, ["My DE"]);
	});

	test("does not match without DataExtensionObject", () => {
		const names = collectProxyMatches("proxy.retrieve('SomeOtherType', cols)");
		assert.deepStrictEqual(names, []);
	});

	test("does not match without square brackets", () => {
		const names = collectProxyMatches("proxy.retrieve('DataExtensionObject', cols)");
		assert.deepStrictEqual(names, []);
	});

	test("finds multiple proxy calls", () => {
		const text = [
			"var a = proxy.retrieve('DataExtensionObject[DE_A]', cols);",
			"var b = proxy.retrieve('DataExtensionObject[DE_B]', cols);"
		].join("\n");
		const names = collectProxyMatches(text);
		assert.deepStrictEqual(names, ["DE_A", "DE_B"]);
	});
});

suite("Script DE – SUPPORTED_SCRIPT_FILE_REGEX", () => {
	const SUPPORTED_SCRIPT_FILE_REGEX = /\/(?:retrieve|deploy)\/[^/]+\/[^/]+\//;

	test("matches retrieve path", () => {
		assert.ok(SUPPORTED_SCRIPT_FILE_REGEX.test("/ws/retrieve/cred/bu/asset/other/file.ssjs"));
	});

	test("matches deploy path", () => {
		assert.ok(SUPPORTED_SCRIPT_FILE_REGEX.test("/ws/deploy/cred/bu/asset/other/file.amp"));
	});

	test("does not match path without cred/bu", () => {
		assert.ok(!SUPPORTED_SCRIPT_FILE_REGEX.test("/ws/retrieve/file.ssjs"));
	});

	test("does not match unrelated paths", () => {
		assert.ok(!SUPPORTED_SCRIPT_FILE_REGEX.test("/ws/src/file.ssjs"));
	});
});

suite("Script DE – SUPPORTED_EXTENSIONS", () => {
	const SUPPORTED_EXTENSIONS = [".amp", ".ssjs", ".html", ".js"];

	test("includes .amp", () => {
		assert.ok(SUPPORTED_EXTENSIONS.includes(".amp"));
	});

	test("includes .ssjs", () => {
		assert.ok(SUPPORTED_EXTENSIONS.includes(".ssjs"));
	});

	test("includes .html", () => {
		assert.ok(SUPPORTED_EXTENSIONS.includes(".html"));
	});

	test("includes .js", () => {
		assert.ok(SUPPORTED_EXTENSIONS.includes(".js"));
	});

	test("does NOT include .sql", () => {
		assert.ok(!SUPPORTED_EXTENSIONS.includes(".sql"));
	});

	test("does NOT include .json", () => {
		assert.ok(!SUPPORTED_EXTENSIONS.includes(".json"));
	});

	test("has exactly 4 extensions", () => {
		assert.strictEqual(SUPPORTED_EXTENSIONS.length, 4);
	});
});
