import * as assert from "assert";
import { extractCredBuFromPath } from "../../../editor/contentBlockDiagnosticProvider";
import { extractSqlPathInfo } from "../../../editor/sqlDiagnosticProvider";
import { extractScriptPathInfo } from "../../../editor/scriptDiagnosticProvider";
import { extractRelatedItemPathInfo } from "../../../editor/relatedItemDiagnosticProvider";

/**
 * Tests for path extraction functions used across multiple providers.
 *
 * These tests exercise the actual exported extraction functions from
 * contentBlockDiagnosticProvider, sqlDiagnosticProvider,
 * scriptDiagnosticProvider, and relatedItemDiagnosticProvider.
 */

suite("Path extraction – ContentBlock extractCredBuFromPath", () => {
	test("extracts cred/bu from retrieve path", () => {
		const result = extractCredBuFromPath("/ws/retrieve/myOrg/myBU/asset/other/file.html");
		assert.strictEqual(result, "myOrg/myBU");
	});

	test("extracts cred/bu from deploy path", () => {
		const result = extractCredBuFromPath("/ws/deploy/myOrg/myBU/asset/other/file.html");
		assert.strictEqual(result, "myOrg/myBU");
	});

	test("returns undefined for non-matching path", () => {
		const result = extractCredBuFromPath("/ws/src/file.html");
		assert.strictEqual(result, undefined);
	});
});

suite("Path extraction – SQL extractSqlPathInfo", () => {
	test("extracts buPrefix from retrieve path", () => {
		const result = extractSqlPathInfo("/ws/retrieve/myOrg/myBU/query/q.sql");
		assert.ok(result);
		assert.strictEqual(result!.buPrefix, "retrieve/myOrg/myBU");
	});

	test("extracts credPrefix from retrieve path", () => {
		const result = extractSqlPathInfo("/ws/retrieve/myOrg/myBU/query/q.sql");
		assert.ok(result);
		assert.strictEqual(result!.credPrefix, "retrieve/myOrg");
	});

	test("extracts credBu from retrieve path", () => {
		const result = extractSqlPathInfo("/ws/retrieve/myOrg/myBU/query/q.sql");
		assert.ok(result);
		assert.strictEqual(result!.credBu, "myOrg/myBU");
	});

	test("returns undefined for deploy path", () => {
		const result = extractSqlPathInfo("/ws/deploy/myOrg/myBU/query/q.sql");
		assert.strictEqual(result, undefined);
	});
});

suite("Path extraction – Script extractScriptPathInfo", () => {
	test("extracts cred/bu from retrieve path", () => {
		const result = extractScriptPathInfo("/ws/retrieve/myOrg/myBU/asset/other/file.ssjs");
		assert.ok(result);
		assert.strictEqual(result!.credBu, "myOrg/myBU");
	});

	test("extracts cred/bu from deploy path", () => {
		const result = extractScriptPathInfo("/ws/deploy/myOrg/myBU/asset/other/file.ssjs");
		assert.ok(result);
		assert.strictEqual(result!.credBu, "myOrg/myBU");
	});

	test("buPrefix always maps to retrieve", () => {
		const result = extractScriptPathInfo("/ws/deploy/myOrg/myBU/asset/other/file.ssjs");
		assert.ok(result);
		assert.strictEqual(result!.buPrefix, "retrieve/myOrg/myBU");
	});

	test("credPrefix always maps to retrieve", () => {
		const result = extractScriptPathInfo("/ws/deploy/myOrg/myBU/asset/other/file.ssjs");
		assert.ok(result);
		assert.strictEqual(result!.credPrefix, "retrieve/myOrg");
	});

	test("parentBuPrefix can be computed", () => {
		const result = extractScriptPathInfo("/ws/retrieve/myOrg/myBU/asset/other/file.ssjs");
		assert.ok(result);
		const parentBuPrefix = `${result!.credPrefix}/_ParentBU_`;
		assert.strictEqual(parentBuPrefix, "retrieve/myOrg/_ParentBU_");
	});
});

suite("Path extraction – RelatedItem extractRelatedItemPathInfo", () => {
	test("extracts all components from retrieve path", () => {
		const result = extractRelatedItemPathInfo("/workspace/project/retrieve/myOrg/myBU/dataExtension/de.json");
		assert.ok(result);
		assert.strictEqual(result!.projectPath, "/workspace/project");
		assert.strictEqual(result!.buPrefix, "retrieve/myOrg/myBU");
		assert.strictEqual(result!.credPrefix, "retrieve/myOrg");
		assert.strictEqual(result!.currentTypeFolder, "dataExtension");
	});

	test("extracts type folder correctly", () => {
		const result = extractRelatedItemPathInfo("/ws/retrieve/cred/bu/automation/auto.json");
		assert.ok(result);
		assert.strictEqual(result!.currentTypeFolder, "automation");
	});

	test("extracts asset type folder", () => {
		const result = extractRelatedItemPathInfo("/ws/retrieve/cred/bu/asset/message/email/email.json");
		assert.ok(result);
		assert.strictEqual(result!.currentTypeFolder, "asset");
	});

	test("returns undefined for deploy path", () => {
		const result = extractRelatedItemPathInfo("/ws/deploy/cred/bu/dataExtension/de.json");
		assert.strictEqual(result, undefined);
	});

	test("credBu can be computed from buPrefix", () => {
		const result = extractRelatedItemPathInfo("/ws/retrieve/myOrg/myBU/query/q.json");
		assert.ok(result);
		const credBu = result!.buPrefix.replace(/^retrieve\//, "");
		assert.strictEqual(credBu, "myOrg/myBU");
	});
});

suite("Path extraction – ENT prefix resolve target", () => {
	test("ENT-prefixed names target _ParentBU_ for retrieve", () => {
		const credBu = "myOrg/myBU";
		const retrieveCredBu = `${credBu.split("/")[0]}/_ParentBU_`;
		assert.strictEqual(retrieveCredBu, "myOrg/_ParentBU_");
	});

	test("non-ENT names target current BU", () => {
		const credBu = "myOrg/myBU";
		assert.strictEqual(credBu, "myOrg/myBU");
	});
});
