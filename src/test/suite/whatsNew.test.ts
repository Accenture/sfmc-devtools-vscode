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

	test("markdownToHtml renders markdown links as safe anchors", () => {
		const html = markdownToHtml("- See [Docs](https://example.com/x?a=1&b=2)\n");
		assert.ok(html.includes('<a href="https://example.com/x?a=1&amp;b=2">Docs</a>'));
	});

	test("markdownToHtml leaves unsafe-scheme links as literal text", () => {
		const html = markdownToHtml("- [click](javascript:alert(1))\n");
		assert.ok(!html.includes("<a "), "must not create an anchor for javascript: URLs");
		assert.ok(html.includes("[click]"), "unsafe link should remain literal text");
	});

	test("markdownToHtml nests indented bullets into sub-lists", () => {
		const html = markdownToHtml("- top\n  - child\n  - child2\n- top2\n");
		// two <ul> opened (one nested), both closed
		assert.strictEqual((html.match(/<ul>/g) ?? []).length, 2);
		assert.strictEqual((html.match(/<\/ul>/g) ?? []).length, 2);
		assert.ok(html.includes("<li>top</li>"));
		assert.ok(html.includes("<li>child</li>"));
		assert.ok(html.includes("<li>top2</li>"));
	});

	test("markdownToHtml handles two-level nesting and dedent", () => {
		const html = markdownToHtml("- a\n  - b\n    - c\n- d\n");
		assert.strictEqual((html.match(/<ul>/g) ?? []).length, 3);
		assert.strictEqual((html.match(/<\/ul>/g) ?? []).length, 3);
	});
});
