import * as assert from "assert";
import Mcdev from "../../devtools/mcdev";

/**
 * Tests for Mcdev.isActionSupportedForType()
 *
 * This is the core blocking mechanism that prevents commands (deploy, delete,
 * changekey) from running on metadata types that do not support those actions.
 *
 * Key behaviors verified:
 * - Known types with selective support (e.g. `email` is retrieve-only)
 * - Known types that support all actions (e.g. `dataExtension`, `automation`)
 * - Retrieve-only types (e.g. `attributeGroup`) are blocked for mutating actions
 * - Unknown types are always blocked for known actions (no permissive pass-through)
 * - Asset sub-types (e.g. "asset-block") are resolved to their base type "asset"
 * - Unknown action names return `true` (permissive for future actions)
 */
suite("Mcdev.isActionSupportedForType", () => {
	let mcdev: Mcdev;

	setup(() => {
		mcdev = new Mcdev();
	});

	// ─── email: retrieve-only (deprecated type) ───────────────────────────────

	suite("email (retrieve-only deprecated type)", () => {
		test("retrieve is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "email"), true);
		});

		test("deploy is BLOCKED — email does not support create or update", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("deploy", "email"),
				false,
				"deploy on email should be blocked"
			);
		});

		test("delete is BLOCKED — email does not support delete", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("delete", "email"),
				false,
				"delete on email should be blocked"
			);
		});

		test("changekey is BLOCKED — email does not support changeKey", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("changekey", "email"),
				false,
				"changekey on email should be blocked"
			);
		});
	});

	// ─── dataExtension: all actions supported ─────────────────────────────────

	suite("dataExtension (all actions supported)", () => {
		test("retrieve is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "dataExtension"), true);
		});

		test("deploy is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("deploy", "dataExtension"), true);
		});

		test("delete is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("delete", "dataExtension"), true);
		});

		test("changekey is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("changekey", "dataExtension"), true);
		});
	});

	// ─── automation: all actions supported ────────────────────────────────────

	suite("automation (all actions supported)", () => {
		test("retrieve is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "automation"), true);
		});

		test("deploy is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("deploy", "automation"), true);
		});

		test("delete is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("delete", "automation"), true);
		});

		test("changekey is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("changekey", "automation"), true);
		});
	});

	// ─── attributeGroup: retrieve-only ────────────────────────────────────────

	suite("attributeGroup (retrieve-only)", () => {
		test("retrieve is allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "attributeGroup"), true);
		});

		test("deploy is BLOCKED", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("deploy", "attributeGroup"), false);
		});

		test("delete is BLOCKED", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("delete", "attributeGroup"), false);
		});

		test("changekey is BLOCKED", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("changekey", "attributeGroup"), false);
		});
	});

	// ─── asset: all actions supported + subtype resolution ───────────────────

	suite("asset (all actions + subtype resolution)", () => {
		test("asset base type supports retrieve", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("retrieve", "asset"), true);
		});

		test("asset base type supports deploy", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("deploy", "asset"), true);
		});

		test("asset base type supports delete", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("delete", "asset"), true);
		});

		test("asset base type supports changekey", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("changekey", "asset"), true);
		});

		test("asset-block (subtype) resolves to 'asset' base type → retrieve allowed", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("retrieve", "asset-block"),
				true,
				"asset-block should resolve to asset base type"
			);
		});

		test("asset-message (subtype) resolves to 'asset' base type → deploy allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("deploy", "asset-message"), true);
		});

		test("asset-cloudpage (subtype) resolves to 'asset' base type → delete allowed", () => {
			assert.strictEqual(mcdev.isActionSupportedForType("delete", "asset-cloudpage"), true);
		});
	});

	// ─── Unknown metadata type: always blocked ────────────────────────────────

	suite("unknown metadata type (always blocked)", () => {
		test("retrieve is BLOCKED for unknown type", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("retrieve", "unknownFolderName"),
				false,
				"unknown type should be blocked for retrieve"
			);
		});

		test("deploy is BLOCKED for unknown type", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("deploy", "unknownFolderName"),
				false,
				"unknown type should be blocked for deploy"
			);
		});

		test("delete is BLOCKED for unknown type", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("delete", "unknownFolderName"),
				false,
				"unknown type should be blocked for delete"
			);
		});

		test("changekey is BLOCKED for unknown type", () => {
			assert.strictEqual(
				mcdev.isActionSupportedForType("changekey", "unknownFolderName"),
				false,
				"unknown type should be blocked for changekey"
			);
		});
	});

	// ─── Unknown action: permissive ───────────────────────────────────────────

	test("unknown action name returns true (permissive for future actions)", () => {
		assert.strictEqual(
			mcdev.isActionSupportedForType("unknownAction", "email"),
			true,
			"unknown action should return true (permissive)"
		);
	});
});
