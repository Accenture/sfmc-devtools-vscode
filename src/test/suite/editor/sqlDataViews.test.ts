import * as assert from "assert";
import { DATA_VIEWS } from "../../../editor/sqlDiagnosticProvider";

suite("SQL – DATA_VIEWS", () => {
	test("contains known email data views", () => {
		assert.ok(DATA_VIEWS.has("_sent"));
		assert.ok(DATA_VIEWS.has("_open"));
		assert.ok(DATA_VIEWS.has("_click"));
		assert.ok(DATA_VIEWS.has("_bounce"));
		assert.ok(DATA_VIEWS.has("_unsubscribe"));
	});

	test("contains subscriber data views", () => {
		assert.ok(DATA_VIEWS.has("_subscribers"));
		assert.ok(DATA_VIEWS.has("_listsubscribers"));
	});

	test("contains journey builder data views", () => {
		assert.ok(DATA_VIEWS.has("_journey"));
		assert.ok(DATA_VIEWS.has("_journeyactivity"));
	});

	test("contains automation studio data views", () => {
		assert.ok(DATA_VIEWS.has("_automationinstance"));
		assert.ok(DATA_VIEWS.has("_automationactivityinstance"));
	});

	test("contains mobile connect data views", () => {
		assert.ok(DATA_VIEWS.has("_smsmessagetracking"));
		assert.ok(DATA_VIEWS.has("_smssubscriptionlog"));
		assert.ok(DATA_VIEWS.has("_undeliverablesms"));
		assert.ok(DATA_VIEWS.has("_mobileaddress"));
		assert.ok(DATA_VIEWS.has("_mobilesubscription"));
	});

	test("contains mobile push data views", () => {
		assert.ok(DATA_VIEWS.has("_pushaddress"));
		assert.ok(DATA_VIEWS.has("_pushtag"));
	});

	test("all keys are lowercase", () => {
		for (const key of DATA_VIEWS.keys()) {
			assert.strictEqual(key, key.toLowerCase(), `Key "${key}" is not lowercase`);
		}
	});

	test("all values are non-empty description strings", () => {
		for (const [key, value] of DATA_VIEWS) {
			assert.ok(typeof value === "string" && value.length > 0, `Value for "${key}" must be a non-empty string`);
		}
	});

	test("does not contain user-defined DEs", () => {
		assert.ok(!DATA_VIEWS.has("mycustomde"));
		assert.ok(!DATA_VIEWS.has("mydataextension"));
	});

	test("all data view names start with underscore", () => {
		for (const key of DATA_VIEWS.keys()) {
			assert.ok(key.startsWith("_"), `Data view "${key}" should start with underscore`);
		}
	});

	test("has at least 25 data views", () => {
		assert.ok(DATA_VIEWS.size >= 25, `Expected at least 25 data views, got ${DATA_VIEWS.size}`);
	});
});
