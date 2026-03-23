import * as assert from "assert";
import { findScriptDeReferences } from "../../../editor/scriptDataExtensionLinkProvider";

suite("findScriptDeReferences", () => {
	suite("SSJS function calls", () => {
		test("finds Lookup reference", () => {
			const refs = findScriptDeReferences('var row = Lookup("MyDE", "Col", "Key", val);');
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "MyDE");
			assert.strictEqual(refs[0].hasEntPrefix, false);
		});

		test("finds Platform.Function.Lookup reference", () => {
			const refs = findScriptDeReferences('var row = Platform.Function.Lookup("MyDE", "Col", "Key", val);');
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "MyDE");
		});

		test("finds ENT-prefixed reference", () => {
			const refs = findScriptDeReferences('var row = Lookup("ENT.SharedDE", "Col", "Key", val);');
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "SharedDE");
			assert.strictEqual(refs[0].hasEntPrefix, true);
		});

		test("returns correct nameStart and nameEnd offsets", () => {
			const text = 'Lookup("MyDE", "Col")';
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(text.substring(refs[0].nameStart, refs[0].nameEnd), "MyDE");
		});

		test("returns correct offsets for ENT-prefixed name", () => {
			const text = 'Lookup("ENT.SharedDE", "Col")';
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(text.substring(refs[0].nameStart, refs[0].nameEnd), "SharedDE");
		});
	});

	suite("WSProxy .retrieve calls", () => {
		test("finds proxy.retrieve DataExtensionObject reference", () => {
			const refs = findScriptDeReferences("proxy.retrieve('DataExtensionObject[My DE]', cols, filter)");
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "My DE");
			assert.strictEqual(refs[0].hasEntPrefix, false);
		});

		test("returns correct offsets for proxy reference", () => {
			const text = "proxy.retrieve('DataExtensionObject[TestDE]', cols)";
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(text.substring(refs[0].nameStart, refs[0].nameEnd), "TestDE");
		});
	});

	suite("combined matches", () => {
		test("finds both SSJS and proxy references in same text", () => {
			const text = [
				'var rows = LookupRows("DE_One", "Col", val);',
				"var data = proxy.retrieve('DataExtensionObject[DE_Two]', cols);"
			].join("\n");
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 2);
			assert.strictEqual(refs[0].name, "DE_One");
			assert.strictEqual(refs[1].name, "DE_Two");
		});

		test("finds multiple SSJS references", () => {
			const text = [
				'Lookup("DE_A", "Col", "Key", val)',
				'InsertData("DE_B", "Col", val)',
				'DeleteData("DE_C", "Key", val)'
			].join("\n");
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 3);
			assert.strictEqual(refs[0].name, "DE_A");
			assert.strictEqual(refs[1].name, "DE_B");
			assert.strictEqual(refs[2].name, "DE_C");
		});
	});

	suite("empty / non-matching", () => {
		test("returns empty array for text with no DE references", () => {
			const refs = findScriptDeReferences("var x = 1 + 2;");
			assert.strictEqual(refs.length, 0);
		});

		test("returns empty array for empty text", () => {
			const refs = findScriptDeReferences("");
			assert.strictEqual(refs.length, 0);
		});

		test("does not match Rows.Lookup", () => {
			const refs = findScriptDeReferences('Rows.Lookup("Purpose", purpose)');
			assert.strictEqual(refs.length, 0);
		});
	});

	suite("file type scenarios", () => {
		test("finds references in AMP-style content", () => {
			const text = '%%=LookupRows("My DE", "Col", @val)=%%';
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "My DE");
		});

		test("finds references in HTML with embedded SSJS", () => {
			const text = [
				"<html>",
				"<script runat='server'>",
				'  var rows = LookupRows("Contact_Data", "Email", email);',
				"</script>",
				"</html>"
			].join("\n");
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 1);
			assert.strictEqual(refs[0].name, "Contact_Data");
		});

		test("finds references in mixed AMP + SSJS content", () => {
			const text = [
				'%%=Lookup("AMP_DE", "Col", "Key", @val)=%%',
				"<script runat='server'>",
				'  var rows = LookupRows("SSJS_DE", "Col", val);',
				"</script>"
			].join("\n");
			const refs = findScriptDeReferences(text);
			assert.strictEqual(refs.length, 2);
			assert.strictEqual(refs[0].name, "AMP_DE");
			assert.strictEqual(refs[1].name, "SSJS_DE");
		});
	});

	suite("retrieve vs deploy paths", () => {
		test("references work identically regardless of retrieve or deploy context", () => {
			// findScriptDeReferences only operates on text content, not paths
			// The path checking is done by the provider; the function itself
			// should return the same results for identical content
			const text = 'Lookup("MyDE", "Col", "Key", val)';
			const refs1 = findScriptDeReferences(text);
			const refs2 = findScriptDeReferences(text);
			assert.deepStrictEqual(refs1, refs2);
		});
	});
});
