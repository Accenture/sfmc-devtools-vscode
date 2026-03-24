import { VSCode } from "@types";

/**
 * Possible states for a caching activity.
 */
type CacheStatus = "loading" | "done";

/**
 * Describes a single caching activity shown in the tooltip.
 */
interface ICacheEntry {
	/** Human-readable label */
	label: string;
	/** Current status */
	status: CacheStatus;
}

/**
 * Callback invoked whenever the aggregate loading state changes.
 * Receives `true` when at least one cache entry is loading,
 * `false` when all entries are done.
 */
type LoadingStateCallback = (isLoading: boolean) => void;

/**
 * Maps setting keys to human-readable labels shown in the tooltip.
 */
const SETTING_LABELS: Record<string, string> = {
	recommendExtensions: "Recommend Extensions",
	warnOnMissingJsonRelation: "Warn on Missing JSON Relation",
	warnOnContentBlockByKey: "Warn on ContentBlockByKey",
	warnOnMissingSqlDataExtension: "Warn on Missing SQL Data Extension",
	warnOnMissingScriptDataExtension: "Warn on Missing Script Data Extension",
	showSqlDataViewHoverNotice: "Show SQL Data View Hover Notice"
};

/**
 * Manages the rich MarkdownString tooltip displayed when hovering the
 * "mcdev" status bar item.  Sections:
 *
 * 1. A link that opens the extension output channel.
 * 2. Caching status with live indicators.
 * 3. User-level boolean settings with toggle checkboxes and a gear icon
 *    to jump to the extension settings page.
 *
 * Also tracks the aggregate loading state and notifies a callback so the
 * status bar icon can be toggled between a loading spinner and the idle icon.
 *
 * @class StatusBarTooltipProvider
 */
class StatusBarTooltipProvider {
	/** The extension name used to scope commands and settings. */
	private readonly extensionName: string;

	/** The status bar item whose tooltip is managed. */
	private statusBarItem: VSCode.StatusBarItem | null = null;

	/** Map of cache-entry id → entry. */
	private readonly cacheEntries = new Map<string, ICacheEntry>();

	/** Optional callback invoked when the aggregate loading state changes. */
	private onLoadingStateChanged: LoadingStateCallback | null = null;

	/** Tracks the last emitted aggregate loading state to avoid duplicate callbacks. */
	private lastEmittedLoading: boolean | null = null;

	/**
	 * Creates an instance of StatusBarTooltipProvider.
	 *
	 * @param extensionName - The extension identifier (e.g. "sfmc-devtools-vscode").
	 */
	constructor(extensionName: string) {
		this.extensionName = extensionName;
	}

	/**
	 * Binds this provider to a status bar item so that subsequent
	 * {@link update} calls refresh its tooltip.
	 *
	 * @param item - The status bar item to manage.
	 */
	setStatusBarItem(item: VSCode.StatusBarItem): void {
		this.statusBarItem = item;
	}

	/**
	 * Registers a callback that is invoked whenever the aggregate loading
	 * state changes (any cache loading → true, all caches done → false).
	 *
	 * @param callback - The callback to invoke.
	 */
	setLoadingStateCallback(callback: LoadingStateCallback): void {
		this.onLoadingStateChanged = callback;
	}

	/**
	 * Returns true when at least one cache entry is in "loading" state.
	 *
	 * @returns Whether any cache is currently loading.
	 */
	isAnyCacheLoading(): boolean {
		for (const entry of this.cacheEntries.values()) {
			if (entry.status === "loading") return true;
		}
		return false;
	}

	/**
	 * Registers a new caching activity with an initial "loading" status.
	 *
	 * @param id    - Unique identifier for the cache entry.
	 * @param label - Human-readable label.
	 */
	addCacheEntry(id: string, label: string): void {
		this.cacheEntries.set(id, { label, status: "loading" });
	}

	/**
	 * Marks a caching activity as completed and refreshes the tooltip.
	 *
	 * @param id - Identifier of the cache entry.
	 */
	setCacheDone(id: string): void {
		const entry = this.cacheEntries.get(id);
		if (entry) {
			entry.status = "done";
			this.update();
			this.emitLoadingState();
		}
	}

	/**
	 * Resets a caching activity back to "loading" and refreshes the tooltip.
	 *
	 * @param id - Identifier of the cache entry.
	 */
	setCacheLoading(id: string): void {
		const entry = this.cacheEntries.get(id);
		if (entry) {
			entry.status = "loading";
			this.update();
			this.emitLoadingState();
		}
	}

	/**
	 * Rebuilds and applies the tooltip MarkdownString on the status bar item.
	 */
	update(): void {
		if (!this.statusBarItem) return;
		this.statusBarItem.tooltip = this.buildTooltip();
	}

	/**
	 * Emits the loading-state callback when the aggregate state changes.
	 */
	private emitLoadingState(): void {
		if (!this.onLoadingStateChanged) return;
		const isLoading = this.isAnyCacheLoading();
		if (isLoading !== this.lastEmittedLoading) {
			this.lastEmittedLoading = isLoading;
			this.onLoadingStateChanged(isLoading);
		}
	}

	/**
	 * Builds the full MarkdownString for the tooltip.
	 *
	 * @returns The MarkdownString content.
	 */
	private buildTooltip(): VSCode.MarkdownString {
		const md = new VSCode.MarkdownString("", true);
		md.isTrusted = true;
		md.supportThemeIcons = true;

		const extName = this.extensionName;

		// ── Section 1: Output channel link ──
		md.appendMarkdown(
			`[$(terminal) Show Output](command:${extName}.openOutputChannel "Show mcdev Output Channel")\n\n`
		);

		// ── Section 2: Caching status ──
		if (this.cacheEntries.size > 0) {
			md.appendMarkdown("---\n\n");
			md.appendMarkdown("**Caching**\n\n");
			for (const [, entry] of this.cacheEntries) {
				const icon = entry.status === "done" ? "$(check)" : "$(loading~spin)";
				md.appendMarkdown(`${icon} ${entry.label}\n\n`);
			}
		}

		// ── Section 3: User settings ──
		md.appendMarkdown("---\n\n");
		const settingsCommandUri = `command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify(extName))}`;
		md.appendMarkdown(`**Settings** &nbsp;[$(gear)](${settingsCommandUri} "Open mcdev Settings")\n\n`);

		const config = VSCode.workspace.getConfiguration(extName);
		for (const [key, label] of Object.entries(SETTING_LABELS)) {
			const enabled = Boolean(config.get(key, true));
			const checkboxIcon = enabled ? "$(pass-filled)" : "$(circle-large-outline)";
			const toggleArgs = encodeURIComponent(JSON.stringify(key));
			const toggleUri = `command:${extName}.toggleSetting?${toggleArgs}`;
			md.appendMarkdown(`[${checkboxIcon}](${toggleUri} "Toggle ${label}") ${label}\n\n`);
		}

		return md;
	}
}

export { StatusBarTooltipProvider, SETTING_LABELS };
export type { CacheStatus, ICacheEntry };
