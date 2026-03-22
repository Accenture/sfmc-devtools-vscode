import { VSCode } from "@types";

/**
 * Pattern matching ContentBlockByKey() calls with single or double quotes,
 * optional surrounding whitespace, and optional escaped quotes.
 *
 * Matches:
 *   ContentBlockByKey("key")
 *   ContentBlockByKey( "key" )
 *   ContentBlockByKey('key')
 *   ContentBlockByKey( 'key' )
 *   ContentBlockByKey(\"key\")
 */
const CONTENT_BLOCK_REGEX = /ContentBlockByKey\(\s*\\?["']([^"'\\]+)\\?["']\s*\)/g;

/**
 * Matches file paths that belong to the retrieve or deploy top-level folders.
 * Uses forward slashes since VSCode URIs are always POSIX-style.
 */
const SUPPORTED_FOLDER_REGEX = /\/(?:retrieve|deploy)\//;

/**
 * Glob used to discover all content-block asset files under retrieve/.
 * Matches: retrieve/<cred>/<bu>/asset/{other,block}/<key>.asset-*-meta.*
 */
const ASSET_CACHE_GLOB = "retrieve/*/*/asset/{other,block}/*.asset-*-meta.*";

/**
 * Priority order when multiple files share the same key (highest wins).
 * Code files are preferred over the JSON metadata file so that clicking a
 * ContentBlockByKey reference opens the editable source, not the JSON.
 */
const EXTENSION_PRIORITY: Record<string, number> = { amp: 3, html: 2, ssjs: 1 };

/**
 * Returns a numeric priority for a URI based on its file extension.
 * Higher means more preferred. Unknown extensions (e.g. .json) score 0.
 */
function getExtensionPriority(uri: VSCode.Uri): number {
	const ext = uri.path.split(".").pop() ?? "";
	return EXTENSION_PRIORITY[ext] ?? 0;
}

/**
 * Extracts the content-block key from an asset URI.
 *
 * Example: .../asset/other/MyKey.asset-other-meta.html  →  "MyKey"
 *
 * Asset files use a double extension: <key>.<subtype>.<ext>.
 * We strip both trailing extensions to recover the bare key.
 */
function extractKeyFromUri(uri: VSCode.Uri): string | undefined {
	const fileName = uri.path.split("/").pop();
	if (!fileName) return undefined;
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot < 0) return fileName;
	const secondLastDot = fileName.lastIndexOf(".", lastDot - 1);
	if (secondLastDot < 0) return fileName.substring(0, lastDot);
	return fileName.substring(0, secondLastDot);
}

/**
 * Document link provider for ContentBlockByKey references.
 * Turns ContentBlockByKey("key") calls into clickable links that open
 * the corresponding SFMC asset file in the workspace.
 *
 * A key cache is pre-built at startup by scanning all files that match
 * retrieve/<cred>/<bu>/asset/{other,block}/<key>.asset-*-meta.* and kept
 * live by a FileSystemWatcher registered in activateLinkProviders().
 * provideDocumentLinks() then does a simple in-memory map lookup instead
 * of issuing a workspace.findFiles() call for every key on every open.
 *
 * When both a code file (.amp/.html/.ssjs) and a JSON metadata file exist
 * for the same key, the code file is preferred so that Ctrl+Click opens
 * the editable source rather than the JSON descriptor.
 *
 * Only active for files inside the retrieve/ or deploy/ folders.
 * Markdown (.md) and SQL (.sql) files are excluded.
 *
 * @class ContentBlockLinkProvider
 * @implements {VSCode.DocumentLinkProvider}
 */
class ContentBlockLinkProvider implements VSCode.DocumentLinkProvider {
	/**
	 * Pre-built map of content-block key → preferred asset file URI.
	 * Populated by init() and kept current by addToCache / removeFromCache.
	 */
	private readonly keyCache = new Map<string, VSCode.Uri>();

	/**
	 * Scans all retrieve/<cred>/<bu>/asset/{other,block} files in the workspace
	 * and populates keyCache. Called once at extension startup (fire-and-forget).
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async init(): Promise<void> {
		const files = await VSCode.workspace.findFiles(ASSET_CACHE_GLOB);
		for (const uri of files) {
			this.addToCache(uri);
		}
	}

	/**
	 * Adds a URI to the key cache.
	 * If an entry for this key already exists, it is only replaced when the new
	 * file has a higher extension priority (code file beats JSON).
	 *
	 * @param {VSCode.Uri} uri - URI of the asset file to cache
	 * @returns {void}
	 */
	addToCache(uri: VSCode.Uri): void {
		const key = extractKeyFromUri(uri);
		if (!key) return;
		const existing = this.keyCache.get(key);
		if (!existing || getExtensionPriority(uri) > getExtensionPriority(existing)) {
			this.keyCache.set(key, uri);
		}
	}

	/**
	 * Removes a URI from the key cache.
	 * If the deleted file was the cached entry for its key, the cache is
	 * refreshed by re-scanning the workspace for remaining files with that key
	 * (e.g. falling back from a deleted .amp to the surviving .json).
	 *
	 * @param {VSCode.Uri} uri - URI of the deleted asset file
	 * @returns {void}
	 */
	removeFromCache(uri: VSCode.Uri): void {
		const key = extractKeyFromUri(uri);
		if (!key) return;
		const cached = this.keyCache.get(key);
		if (cached?.toString() !== uri.toString()) return;
		// The cached entry was deleted — refresh from whatever files remain.
		this.keyCache.delete(key);
		VSCode.workspace.findFiles(`retrieve/*/*/asset/{other,block}/${key}.asset-*-meta.*`).then(
			files => files.forEach(f => this.addToCache(f)),
			() => {
				/* ignore — cache entry stays absent until next addToCache */
			}
		);
	}

	/**
	 * Provides document links for all ContentBlockByKey references in a document.
	 * Uses the pre-built keyCache for instant in-memory lookup.
	 *
	 * Returns an empty array when the document is not inside a retrieve/ or deploy/
	 * folder, or when the file has a .md or .sql extension.
	 *
	 * @param {VSCode.TextDocument} document - The document being scanned
	 * @returns {VSCode.DocumentLink[]} Array of document links pointing to found asset files
	 */
	provideDocumentLinks(document: VSCode.TextDocument): VSCode.DocumentLink[] {
		const filePath = document.uri.path;

		// Skip files outside retrieve/ and deploy/ folders, and skip .md and .sql files
		if (!SUPPORTED_FOLDER_REGEX.test(filePath) || filePath.endsWith(".md") || filePath.endsWith(".sql")) return [];

		const text = document.getText();
		const links: VSCode.DocumentLink[] = [];
		let match: RegExpExecArray | null;
		const regex = new RegExp(CONTENT_BLOCK_REGEX.source, "g");

		while ((match = regex.exec(text)) !== null) {
			const key = match[1];
			const uri = this.keyCache.get(key);
			if (!uri) continue;
			const keyOffset = match.index + match[0].indexOf(key);
			const range = new VSCode.Range(document.positionAt(keyOffset), document.positionAt(keyOffset + key.length));
			links.push(new VSCode.DocumentLink(range, uri));
		}

		return links;
	}
}

export { ASSET_CACHE_GLOB, extractKeyFromUri };
export default ContentBlockLinkProvider;
