import * as assert from "assert";
import { StatusBarTooltipProvider, SETTING_LABELS } from "../../../editor/statusBarTooltipProvider";

const EXT_NAME = "sfmc-devtools-vscode";

/**
 * Creates a minimal mock status bar item for testing.
 */
function createMockStatusBarItem(): {
	tooltip: unknown;
	text: string;
	name: string;
	command: string;
} {
	return {
		tooltip: undefined,
		text: "",
		name: "",
		command: ""
	};
}

suite("StatusBarTooltipProvider", () => {
	suite("SETTING_LABELS", () => {
		test("contains all expected settings", () => {
			const expectedKeys = [
				"recommendExtensions",
				"warnOnMissingJsonRelation",
				"warnOnContentBlockByKey",
				"warnOnMissingSqlDataExtension",
				"warnOnMissingScriptDataExtension",
				"showSqlDataViewHoverNotice"
			];
			assert.deepStrictEqual(Object.keys(SETTING_LABELS), expectedKeys);
		});

		test("all labels are non-empty strings", () => {
			for (const [key, label] of Object.entries(SETTING_LABELS)) {
				assert.ok(typeof label === "string" && label.length > 0, `Label for ${key} should be non-empty`);
			}
		});
	});

	suite("cache entries", () => {
		test("addCacheEntry adds entry with loading status", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			provider.addCacheEntry("test", "Test Cache");
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("Test Cache"), "tooltip should contain cache label");
			assert.ok(tooltip.value.includes("$(loading~spin)"), "tooltip should show loading spinner");
		});

		test("setCacheDone changes entry to done status", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			provider.addCacheEntry("test", "Test Cache");
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.setCacheDone("test");
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("Test Cache"), "tooltip should contain cache label");
			assert.ok(tooltip.value.includes("$(check)"), "tooltip should show check mark");
			// The loading spinner should not be present for this entry
			// But $(check) is also used in settings, so check the caching section specifically
			const cachingSection = tooltip.value.split("**Caching**")[1]?.split("---")[0] ?? "";
			assert.ok(!cachingSection.includes("$(loading~spin)"), "caching section should not show loading spinner");
		});

		test("setCacheLoading changes entry back to loading", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			provider.addCacheEntry("test", "Test Cache");
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.setCacheDone("test");
			provider.setCacheLoading("test");
			const tooltip = item.tooltip as { value: string };
			const cachingSection = tooltip.value.split("**Caching**")[1]?.split("---")[0] ?? "";
			assert.ok(cachingSection.includes("$(loading~spin)"), "tooltip should show loading spinner again");
		});

		test("multiple cache entries appear in tooltip", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			provider.addCacheEntry("a", "Cache A");
			provider.addCacheEntry("b", "Cache B");
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.setCacheDone("a");
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("Cache A"), "tooltip should contain Cache A");
			assert.ok(tooltip.value.includes("Cache B"), "tooltip should contain Cache B");
		});
	});

	suite("tooltip content", () => {
		test("tooltip contains output channel link", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(
				tooltip.value.includes(`command:${EXT_NAME}.openOutputChannel`),
				"tooltip should link to output channel command"
			);
			assert.ok(tooltip.value.includes("Show Output"), "tooltip should show output link text");
		});

		test("tooltip contains settings section header", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("**Settings**"), "tooltip should contain Settings header");
		});

		test("tooltip contains cog icon for settings", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("$(gear)"), "tooltip should contain gear icon");
		});

		test("tooltip contains toggle command links for settings", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(
				tooltip.value.includes(`command:${EXT_NAME}.toggleSetting`),
				"tooltip should contain toggle command"
			);
		});

		test("tooltip contains open settings command links", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(
				tooltip.value.includes("command:workbench.action.openSettings"),
				"tooltip should contain open settings command"
			);
		});

		test("tooltip contains all setting labels", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			for (const label of Object.values(SETTING_LABELS)) {
				assert.ok(tooltip.value.includes(label), `tooltip should contain setting label: ${label}`);
			}
		});

		test("tooltip has caching section header when entries exist", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			provider.addCacheEntry("test", "Test Cache");
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes("**Caching**"), "tooltip should contain Caching header");
		});

		test("tooltip omits caching section when no entries", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(!tooltip.value.includes("**Caching**"), "tooltip should not contain Caching header");
		});

		test("tooltip uses extension name in command URIs", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			const item = createMockStatusBarItem();
			provider.setStatusBarItem(item as never);
			provider.update();
			const tooltip = item.tooltip as { value: string };
			assert.ok(tooltip.value.includes(EXT_NAME), "tooltip should reference the extension name");
		});
	});

	suite("update without status bar item", () => {
		test("update does not throw when no status bar item set", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			assert.doesNotThrow(() => provider.update());
		});

		test("setCacheDone without matching entry is a no-op", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			assert.doesNotThrow(() => provider.setCacheDone("nonexistent"));
		});

		test("setCacheLoading without matching entry is a no-op", () => {
			const provider = new StatusBarTooltipProvider(EXT_NAME);
			assert.doesNotThrow(() => provider.setCacheLoading("nonexistent"));
		});
	});
});
