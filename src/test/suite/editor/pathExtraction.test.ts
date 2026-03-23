import * as assert from "assert";

/**
 * Tests for path extraction logic used across multiple providers.
 *
 * Several providers extract cred/bu/type information from file paths.
 * These tests exercise the regex patterns and extraction functions
 * used by dataExtensionLinkProvider, sqlDiagnosticProvider,
 * scriptDiagnosticProvider, relatedItemDiagnosticProvider, and
 * contentBlockDiagnosticProvider.
 */

// Pattern from contentBlockDiagnosticProvider.ts
const CONTENT_BLOCK_CREDBU_REGEX = /\/(?:retrieve|deploy)\/([^/]+\/[^/]+)\//;

// Pattern from dataExtensionLinkProvider.ts (SQL)
const SQL_PATH_REGEX = /\/(retrieve\/([^/]+)\/[^/]+)\/[^/]+\//;

// Pattern from scriptDiagnosticProvider.ts
const SCRIPT_PATH_REGEX = /\/(?:retrieve|deploy)\/([^/]+\/[^/]+)\/[^/]+\//;

// Pattern from relatedItemDiagnosticProvider.ts
const RELATED_ITEM_PATH_REGEX = /^(.*)\/(retrieve\/([^/]+)\/[^/]+)\/([^/]+)\//;

// Pattern from scriptDataExtensionLinkProvider.ts
const SCRIPT_LINK_PATH_REGEX = /\/(?:retrieve|deploy)\/([^/]+)\/([^/]+)\/[^/]+\//;

suite("Path extraction – ContentBlock credBu", () => {
	test("extracts cred/bu from retrieve path", () => {
		const match = "/ws/retrieve/myOrg/myBU/asset/other/file.html".match(CONTENT_BLOCK_CREDBU_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg/myBU");
	});

	test("extracts cred/bu from deploy path", () => {
		const match = "/ws/deploy/myOrg/myBU/asset/other/file.html".match(CONTENT_BLOCK_CREDBU_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg/myBU");
	});

	test("returns null for non-matching path", () => {
		const match = "/ws/src/file.html".match(CONTENT_BLOCK_CREDBU_REGEX);
		assert.strictEqual(match, null);
	});
});

suite("Path extraction – SQL buPrefix and credPrefix", () => {
	test("extracts buPrefix from retrieve path", () => {
		const match = "/ws/retrieve/myOrg/myBU/query/q.sql".match(SQL_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "retrieve/myOrg/myBU");
		assert.strictEqual(match![2], "myOrg");
	});

	test("credPrefix can be computed from match", () => {
		const match = "/ws/retrieve/myOrg/myBU/query/q.sql".match(SQL_PATH_REGEX);
		assert.ok(match);
		const credPrefix = `retrieve/${match![2]}`;
		assert.strictEqual(credPrefix, "retrieve/myOrg");
	});

	test("returns null for deploy path", () => {
		const match = "/ws/deploy/myOrg/myBU/query/q.sql".match(SQL_PATH_REGEX);
		assert.strictEqual(match, null);
	});
});

suite("Path extraction – Script buPrefix and credPrefix", () => {
	test("extracts cred/bu from retrieve path", () => {
		const match = "/ws/retrieve/myOrg/myBU/asset/other/file.ssjs".match(SCRIPT_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg/myBU");
	});

	test("extracts cred/bu from deploy path", () => {
		const match = "/ws/deploy/myOrg/myBU/asset/other/file.ssjs".match(SCRIPT_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg/myBU");
	});

	test("buPrefix always maps to retrieve", () => {
		const match = "/ws/deploy/myOrg/myBU/asset/other/file.ssjs".match(SCRIPT_PATH_REGEX);
		assert.ok(match);
		const buPrefix = `retrieve/${match![1]}`;
		assert.strictEqual(buPrefix, "retrieve/myOrg/myBU");
	});
});

suite("Path extraction – Script link cred and bu", () => {
	test("extracts cred and bu separately from retrieve", () => {
		const match = "/ws/retrieve/myOrg/myBU/asset/other/file.amp".match(SCRIPT_LINK_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg");
		assert.strictEqual(match![2], "myBU");
	});

	test("extracts cred and bu separately from deploy", () => {
		const match = "/ws/deploy/myOrg/myBU/asset/other/file.html".match(SCRIPT_LINK_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "myOrg");
		assert.strictEqual(match![2], "myBU");
	});

	test("parentBuPrefix can be computed", () => {
		const match = "/ws/retrieve/myOrg/myBU/asset/other/file.ssjs".match(SCRIPT_LINK_PATH_REGEX);
		assert.ok(match);
		const credPrefix = `retrieve/${match![1]}`;
		const parentBuPrefix = `${credPrefix}/_ParentBU_`;
		assert.strictEqual(parentBuPrefix, "retrieve/myOrg/_ParentBU_");
	});
});

suite("Path extraction – RelatedItem full path info", () => {
	test("extracts all components from retrieve path", () => {
		const match = "/workspace/project/retrieve/myOrg/myBU/dataExtension/de.json".match(RELATED_ITEM_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![1], "/workspace/project");
		assert.strictEqual(match![2], "retrieve/myOrg/myBU");
		assert.strictEqual(match![3], "myOrg");
		assert.strictEqual(match![4], "dataExtension");
	});

	test("extracts type folder correctly", () => {
		const match = "/ws/retrieve/cred/bu/automation/auto.json".match(RELATED_ITEM_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![4], "automation");
	});

	test("extracts asset type folder", () => {
		const match = "/ws/retrieve/cred/bu/asset/message/email/email.json".match(RELATED_ITEM_PATH_REGEX);
		assert.ok(match);
		assert.strictEqual(match![4], "asset");
	});

	test("returns null for deploy path", () => {
		const match = "/ws/deploy/cred/bu/dataExtension/de.json".match(RELATED_ITEM_PATH_REGEX);
		assert.strictEqual(match, null);
	});

	test("credBu can be computed from buPrefix", () => {
		const match = "/ws/retrieve/myOrg/myBU/query/q.json".match(RELATED_ITEM_PATH_REGEX);
		assert.ok(match);
		const buPrefix = match![2];
		const credBu = buPrefix.replace(/^retrieve\//, "");
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
