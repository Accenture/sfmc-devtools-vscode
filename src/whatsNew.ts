/**
 * What's New: changelog-driven webview after extension updates.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionContext } from "vscode";
import { Uri, ViewColumn, WebviewPanel, window } from "vscode";

import { compareSemver, escapeHtml, markdownToHtml, parseChangelogEntry } from "./whatsNewCore";

export { compareSemver, markdownToHtml, parseChangelogEntry } from "./whatsNewCore";

/** Synced so users don't see duplicate prompts across machines (see VS Code globalState docs). */
export const WHATS_NEW_VERSION_KEY = "whatsNew.lastShownVersion";

const PANEL_VIEW_TYPE = "sfmcDevtools.whatsNew";

let panel: WebviewPanel | undefined;

function getNonce(): string {
	let t = "";
	const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		t += c.charAt(Math.floor(Math.random() * c.length));
	}
	return t;
}

function buildWhatsNewHtml(bodyHtml: string, title: string, nonce: string, cspSource: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 0 1.25rem 1.5rem;
      line-height: 1.5;
    }
    h2 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; color: var(--vscode-foreground); }
    h3 { font-size: 1rem; margin: 1rem 0 0.35rem; color: var(--vscode-descriptionForeground); }
    ul { margin: 0.25rem 0 0.75rem 1.25rem; padding: 0; }
    li { margin: 0.35rem 0; }
    p { margin: 0.35rem 0; }
    pre {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-widget-border);
      padding: 0.75rem;
      overflow-x: auto;
      border-radius: 4px;
    }
    code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    pre code { font-size: inherit; }
    p code, li code {
      background: var(--vscode-textCodeBlock-background);
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    strong { font-weight: 600; }
  </style>
</head>
<body>
  <h2>${escapeHtml(title)}</h2>
  ${bodyHtml}
</body>
</html>`;
}

export async function showWhatsNewPanel(context: ExtensionContext, extensionDisplayName: string): Promise<void> {
	const version = context.extension.packageJSON.version as string;
	const changelogPath = join(context.extensionPath, "CHANGELOG.md");
	let bodyHtml: string;
	try {
		const raw = await readFile(changelogPath, "utf8");
		const entry = parseChangelogEntry(raw, version);
		bodyHtml = entry
			? markdownToHtml(entry)
			: `<p>${escapeHtml(`No changelog section found for v${version}. See the extension marketplace page or GitHub releases for details.`)}</p>`;
	} catch {
		bodyHtml = `<p>${escapeHtml("Could not read CHANGELOG.md.")}</p>`;
	}

	const title = `What's New — ${extensionDisplayName} v${version}`;
	const nonce = getNonce();

	if (panel) {
		panel.title = title;
		panel.webview.html = buildWhatsNewHtml(bodyHtml, title, nonce, panel.webview.cspSource);
		panel.reveal(ViewColumn.Active);
		return;
	}

	panel = window.createWebviewPanel(PANEL_VIEW_TYPE, title, ViewColumn.Active, {
		enableScripts: false,
		retainContextWhenHidden: true,
		localResourceRoots: [Uri.file(context.extensionPath)]
	});
	panel.webview.html = buildWhatsNewHtml(bodyHtml, title, nonce, panel.webview.cspSource);
	panel.onDidDispose(() => {
		panel = undefined;
	});
}

/**
 * After an upgrade, prompt once; opening the panel or choosing Later records the version.
 */
export async function checkAndShowWhatsNew(context: ExtensionContext, extensionDisplayName: string): Promise<void> {
	context.globalState.setKeysForSync([WHATS_NEW_VERSION_KEY]);
	const current = context.extension.packageJSON.version as string;
	const last = context.globalState.get<string>(WHATS_NEW_VERSION_KEY);
	if (last && compareSemver(current, last) <= 0) {
		return;
	}

	const msg = `What's new in ${extensionDisplayName} v${current}`;
	const choice = await window.showInformationMessage(msg, "Show What's New", "Later");
	if (choice === "Show What's New") {
		await showWhatsNewPanel(context, extensionDisplayName);
	}
	await context.globalState.update(WHATS_NEW_VERSION_KEY, current);
}
