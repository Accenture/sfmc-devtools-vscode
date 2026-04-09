import * as assert from "assert";
import * as MessagesEditor from "../../../messages/editor";

suite("Editor messages – Build BU prompts", () => {
	test("businessUnitsFromPrompt labels source BU", () => {
		assert.strictEqual(
			MessagesEditor.businessUnitsFromPrompt,
			"Please select the BU you would like to use as source:"
		);
	});

	test("businessUnitsToPrompt labels target BU", () => {
		assert.strictEqual(
			MessagesEditor.businessUnitsToPrompt,
			"Please select the BU you would like to use as target:"
		);
	});
});
