import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";
import { ASSET_CACHE_GLOB } from "./contentBlockLinkProvider";

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
 */
const SUPPORTED_FOLDER_REGEX = /\/(?:retrieve|deploy)\//;

/**
 * Diagnostic code value used by both the diagnostic provider and the
 * code-action provider to correlate diagnostics with quick fixes.
 */
const DIAGNOSTIC_CODE = "warnOnContentBlockByKey";

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
 * Extracts the "cred/bu" portion from a file path that lives under
 * retrieve/<cred>/<bu>/... or deploy/<cred>/<bu>/...
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns "cred/bu" string, or undefined when the path doesn't match.
 */
function extractCredBuFromPath(filePath: string): string | undefined {
	const match = filePath.match(/\/(?:retrieve|deploy)\/([^/]+\/[^/]+)\//);
	return match ? match[1] : undefined;
}

/**
 * Diagnostic provider for unresolvable ContentBlockByKey references in files
 * inside the retrieve/ or deploy/ folder trees.
 *
 * A global key cache is pre-built at startup by scanning all asset files that
 * match the ASSET_CACHE_GLOB pattern and kept live by addToCache / removeFromCache
 * calls driven by a FileSystemWatcher registered in activateLinkProviders().
 *
 * When a ContentBlockByKey("key") reference is encountered and the key is not
 * present in the cache, a Warning diagnostic is produced.  The diagnostic
 * carries the cred/bu extracted from the file path so that the paired
 * ContentBlockCodeActionProvider can offer the correct "Retrieve" quick fix.
 *
 * Files outside retrieve/ and deploy/ folders, and .md / .sql files, are skipped.
 *
 * @class ContentBlockDiagnosticProvider
 */
class ContentBlockDiagnosticProvider {
	/**
	 * VS Code diagnostic collection that populates the Problems panel and
	 * marks files yellow in the Explorer.
	 */
	private readonly diagnosticCollection: VSCode.DiagnosticCollection;

	/**
	 * Global set of content-block keys found under any
	 * retrieve/<cred>/<bu>/asset/{other,block}/ folder.
	 */
	private readonly keyCache = new Set<string>();

	constructor() {
		this.diagnosticCollection = VSCode.languages.createDiagnosticCollection(`${DIAGNOSTIC_SOURCE}.contentBlock`);
	}

	/**
	 * Scans the workspace for all content-block asset files matching
	 * ASSET_CACHE_GLOB and populates the key cache.
	 * Called once at extension startup (fire-and-forget).
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async init(): Promise<void> {
		const files = await VSCode.workspace.findFiles(ASSET_CACHE_GLOB);
		for (const uri of files) {
			const key = extractKeyFromUri(uri);
			if (key) this.keyCache.add(key);
		}
	}

	/**
	 * Adds a URI to the key cache.
	 * Called by the FileSystemWatcher when an asset file is created.
	 *
	 * @param {VSCode.Uri} uri - URI of the new asset file
	 */
	addToCache(uri: VSCode.Uri): void {
		const key = extractKeyFromUri(uri);
		if (key) this.keyCache.add(key);
	}

	/**
	 * Removes a key from the cache when an asset file is deleted.
	 * If other files with the same key still exist the key is kept in the cache.
	 * After removal all open documents are re-validated so that any newly
	 * unresolvable references immediately produce diagnostics.
	 *
	 * @param {VSCode.Uri} uri - URI of the deleted asset file
	 */
	removeFromCache(uri: VSCode.Uri): void {
		const key = extractKeyFromUri(uri);
		if (!key) return;
		VSCode.workspace.findFiles(`retrieve/*/*/asset/{other,block}/${key}.asset-*-meta.*`).then(
			files => {
				if (files.length === 0) {
					this.keyCache.delete(key);
					// Key no longer exists anywhere — re-validate open documents
					// so that any ContentBlockByKey references to it become warnings.
					VSCode.workspace.textDocuments.forEach(doc => {
						this.validateDocument(doc).catch(err => {
							console.error(
								"[sfmc-devtools-vscode] ContentBlockDiagnosticProvider remove revalidation failed:",
								err
							);
						});
					});
				}
			},
			() => {
				/* ignore — key stays in cache until next explicit validation */
			}
		);
	}

	/**
	 * Exposes the diagnostic collection so the caller can register it as a
	 * disposable.
	 */
	getDiagnosticCollection(): VSCode.DiagnosticCollection {
		return this.diagnosticCollection;
	}

	/**
	 * Removes all diagnostics for the given document URI.
	 * Called when a document is closed.
	 *
	 * @param uri - URI of the closed document
	 */
	clearDocument(uri: VSCode.Uri): void {
		this.diagnosticCollection.delete(uri);
	}

	/**
	 * Validates all ContentBlockByKey references in a document and updates
	 * the diagnostic collection.
	 *
	 * For each reference whose key is absent from the key cache a Warning
	 * diagnostic is produced.
	 *
	 * This method is a no-op for files outside the retrieve/ or deploy/ folder
	 * trees, and for .md and .sql files.
	 *
	 * @param document - The document to validate
	 * @returns Promise that resolves once diagnostics have been updated
	 */
	async validateDocument(document: VSCode.TextDocument): Promise<void> {
		const filePath = document.uri.path;

		if (!SUPPORTED_FOLDER_REGEX.test(filePath) || filePath.endsWith(".md") || filePath.endsWith(".sql")) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		const text = document.getText();
		const credBu = extractCredBuFromPath(filePath) ?? "";
		const diagnostics: VSCode.Diagnostic[] = [];

		const regex = new RegExp(CONTENT_BLOCK_REGEX.source, "g");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const key = match[1];
			if (this.keyCache.has(key)) continue;

			const keyOffset = match.index + match[0].indexOf(key);
			const range = new VSCode.Range(document.positionAt(keyOffset), document.positionAt(keyOffset + key.length));

			const diagnostic = new VSCode.Diagnostic(
				range,
				`Content block with key '${key}' cannot be resolved: it was not found in the retrieve tree.`,
				VSCode.DiagnosticSeverity.Warning
			);
			diagnostic.source = DIAGNOSTIC_SOURCE;
			diagnostic.code = {
				value: DIAGNOSTIC_CODE,
				target: VSCode.Uri.parse(
					`vscode://settings/${DIAGNOSTIC_SOURCE}.${DIAGNOSTIC_CODE}?credBu=${encodeURIComponent(credBu)}&key=${encodeURIComponent(key)}`
				)
			};
			diagnostics.push(diagnostic);
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}
}

export { DIAGNOSTIC_CODE };
export default ContentBlockDiagnosticProvider;
