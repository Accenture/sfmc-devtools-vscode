import * as assert from "assert";
import { compareSemver, markdownToHtml, parseChangelogEntry } from "../../whatsNewCore";

suite("whatsNew", () => {
	test("parseChangelogEntry extracts section for version and stops at next header", () => {
		const md =
			"# Changelog\n\n## [1.0.0] — 2026-01-01\n\n### Added\n\n- Foo line\n\n## [0.9.0] — 2025-01-01\n\n- Old";
		const section = parseChangelogEntry(md, "1.0.0");
		assert.ok(section?.includes("Foo line"));
		assert.ok(!section?.includes("Old"));
	});

	test("parseChangelogEntry returns null when version missing", () => {
		assert.strictEqual(parseChangelogEntry("## [1.0.0]\n\nHi", "2.0.0"), null);
	});

	test("compareSemver orders major.minor.patch", () => {
		assert.ok(compareSemver("2.0.0", "1.9.9") > 0);
		assert.strictEqual(compareSemver("1.0.0", "1.0.0"), 0);
	});

	test("markdownToHtml renders list and bold", () => {
		const html = markdownToHtml("### Added\n\n- **Bold** word\n");
		assert.ok(html.includes("<strong>Bold</strong>"));
	});
});
