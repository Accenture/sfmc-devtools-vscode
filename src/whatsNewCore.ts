/**
 * Changelog parsing and minimal markdown HTML (no vscode dependency — safe for Node unit tests).
 */

/** Compare semver strings (numeric segments only). Returns positive if a > b. */
export function compareSemver(a: string, b: string): number {
	const pa = a.split(".").map(p => Number.parseInt(p, 10) || 0);
	const pb = b.split(".").map(p => Number.parseInt(p, 10) || 0);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const da = pa[i] ?? 0;
		const db = pb[i] ?? 0;
		if (da > db) return 1;
		if (da < db) return -1;
	}
	return 0;
}

/**
 * Extract the changelog body for a given version (Keep a Changelog style: ## [x.y.z]).
 */
export function parseChangelogEntry(changelog: string, version: string): string | null {
	const escaped = version.replaceAll(/[.*+?^${}()|[\]\\]/g, ch => `\\${ch}`);
	const re = new RegExp(String.raw`^## \[${escaped}\]` + String.raw`[^\n]*\n`, "m");
	const match = changelog.match(re);
	if (!match || match.index === undefined) {
		return null;
	}
	const start = match.index + match[0].length;
	const rest = changelog.slice(start);
	const nextIdx = rest.search(/^## \[/m);
	const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
	return body.trim();
}

export function escapeHtml(s: string): string {
	return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Only http(s)/mailto links are turned into anchors; anything else is left as plain text. */
function isSafeUrl(url: string): boolean {
	return /^(https?:\/\/|mailto:)/i.test(url);
}

function inlineMarkdown(escaped: string): string {
	// [text](url) → anchor. Runs on already-escaped text, so "&" in URLs is "&amp;"
	// (harmless in href). Only safe schemes become links; others stay as literal text.
	let s = escaped.replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text: string, url: string) =>
		isSafeUrl(url) ? `<a href="${url}">${text}</a>` : match
	);
	s = s.replaceAll(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
	s = s.replaceAll(/`([^`]+)`/g, "<code>$1</code>");
	return s;
}

function renderMarkdownChunk(chunk: string): string {
	const lines = chunk.split(/\r?\n/);
	const out: string[] = [];
	// Indentation (in spaces) of each currently-open <ul>, outermost first.
	const listIndents: number[] = [];

	const closeLists = (toDepth: number) => {
		while (listIndents.length > toDepth) {
			out.push("</ul>");
			listIndents.pop();
		}
	};

	for (const line of lines) {
		const h3 = line.match(/^###\s+(.+)$/);
		if (h3) {
			closeLists(0);
			out.push(`<h3>${inlineMarkdown(escapeHtml(h3[1]!.trim()))}</h3>`);
			continue;
		}
		const h2 = line.match(/^##\s+(.+)$/);
		if (h2) {
			closeLists(0);
			out.push(`<h2>${inlineMarkdown(escapeHtml(h2[1]!.trim()))}</h2>`);
			continue;
		}
		const bullet = line.match(/^(\s*)-\s+(.+)$/);
		if (bullet) {
			const indent = bullet[1]!.replaceAll("\t", "  ").length;
			// Open a deeper list only when this bullet is indented past the current level;
			// close lists back to the matching level when it dedents.
			if (listIndents.length === 0 || indent > listIndents[listIndents.length - 1]!) {
				out.push("<ul>");
				listIndents.push(indent);
			} else {
				while (listIndents.length > 1 && indent < listIndents[listIndents.length - 1]!) {
					out.push("</ul>");
					listIndents.pop();
				}
			}
			out.push(`<li>${inlineMarkdown(escapeHtml(bullet[2]!.trim()))}</li>`);
			continue;
		}
		if (line.trim() === "") {
			closeLists(0);
			continue;
		}
		closeLists(0);
		out.push(`<p>${inlineMarkdown(escapeHtml(line.trim()))}</p>`);
	}
	closeLists(0);
	return out.join("");
}

/** Minimal markdown → HTML for changelog sections (headings, lists, bold, code). */
export function markdownToHtml(md: string): string {
	const parts: string[] = [];
	const fence = /^```(\w*)\r?\n([\s\S]*?)^```$/gm;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = fence.exec(md)) !== null) {
		if (m.index > last) {
			parts.push(renderMarkdownChunk(md.slice(last, m.index)));
		}
		const code = escapeHtml(m[2] ?? "");
		const lang = m[1] ? ` class="language-${escapeHtml(m[1])}"` : "";
		parts.push(`<pre><code${lang}>${code}</code></pre>`);
		last = m.index + m[0].length;
	}
	if (last < md.length) {
		parts.push(renderMarkdownChunk(md.slice(last)));
	}
	return parts.join("");
}
