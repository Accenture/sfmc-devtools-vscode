import { VSCode } from "@types";

/**
 * Matches "r__TYPE_key": "VALUE" patterns in JSON files.
 *
 * Group 1: TYPE  — the metadata folder name (e.g. "dataExtension", "importFile")
 * Group 2: VALUE — the key of the referenced item (e.g. "myKey1")
 */
const R_TYPE_KEY_REGEX = /"r__(\w+)_key"\s*:\s*"([^"]+)"/g;

/**
 * Matches automation-style r__type / r__key pairs where r__type appears first.
 *
 * Group 1: type value (e.g. "query")
 * Group 2: key value  (e.g. "ActivityKey1")
 */
const AUTOMATION_FORWARD_REGEX = /"r__type"\s*:\s*"([^"]+)"[^{}]*?"r__key"\s*:\s*"([^"]+)"/g;

/**
 * Matches automation-style r__key / r__type pairs where r__key appears first.
 *
 * Group 1: key value  (e.g. "ActivityKey1")
 * Group 2: type value (e.g. "query")
 */
const AUTOMATION_REVERSE_REGEX = /"r__key"\s*:\s*"([^"]+)"[^{}]*?"r__type"\s*:\s*"([^"]+)"/g;

/**
 * Matches file paths that belong to the retrieve top-level folder and have
 * the expected depth: retrieve/<cred>/<bu>/<type>/...
 */
const SUPPORTED_FILE_REGEX = /\/retrieve\/[^/]+\/[^/]+\/[^/]+\//;

/**
 * Diagnostic collection name / source identifier used by both the diagnostic
 * provider and the code-action provider so they can be correlated.
 */
const DIAGNOSTIC_SOURCE = "sfmc-devtools-vscode";

/**
 * Extracts path components from a file URI path.
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns buPrefix ("retrieve/cred/bu"), credPrefix ("retrieve/cred"),
 *          and currentTypeFolder (the immediate metadata-type folder name),
 *          or undefined when the path does not match the expected structure.
 */
function extractPathInfo(
	filePath: string
): { buPrefix: string; credPrefix: string; currentTypeFolder: string } | undefined {
	const match = filePath.match(/\/(retrieve\/([^/]+)\/[^/]+)\/([^/]+)\//);
	if (!match) return undefined;
	return {
		buPrefix: match[1],
		credPrefix: `retrieve/${match[2]}`,
		currentTypeFolder: match[3]
	};
}

/**
 * Returns the absolute document offset of the last-captured group value when
 * the value appears at the very end of the matched string.
 */
function getTrailingValueStart(matchIndex: number, matchStr: string, value: string): number {
	return matchIndex + matchStr.length - value.length - 1;
}

/**
 * Returns the absolute document offset of the first-captured group value when
 * it appears at the very beginning of the matched string.
 */
function getLeadingValueStart(matchIndex: number, matchStr: string, fieldName: string): number {
	const fieldWithQuotes = `"${fieldName}"`;
	const openingQuoteOffset = matchStr.indexOf('"', fieldWithQuotes.length);
	return matchIndex + openingQuoteOffset + 1;
}

/**
 * Diagnostic provider for unresolvable r__TYPE_key / r__type + r__key references
 * in SFMC JSON metadata files.
 *
 * Emits VS Code Error diagnostics for every relation-field value whose target
 * file cannot be found under the same retrieve/cred/bu tree.  Each diagnostic
 * carries a JSON-encoded `code` string with the retrieve coordinates
 * (`credBu`, `type`, `key`) so that {@link RelatedItemCodeActionProvider} can
 * build the "Retrieve type:key from cred/bu" quick-fix without additional
 * look-ups.
 *
 * Resolved paths are cached to avoid repeated filesystem searches; the cache
 * is cleared by the caller (activateLinkProviders) whenever files are added
 * or removed from the retrieve tree, and fresh diagnostics are issued for all
 * currently-open JSON documents.
 *
 * @class RelatedItemDiagnosticProvider
 */
class RelatedItemDiagnosticProvider {
	/**
	 * VS Code diagnostic collection that populates the Problems panel and
	 * marks files red in the Explorer.
	 */
	private readonly diagnosticCollection: VSCode.DiagnosticCollection;

	/**
	 * Cache for resolved file lookups.
	 * Key format: "buPrefix|type|key" (or "buPrefix|asset|key|in/out")
	 * Value: true when the file exists, false when it does not.
	 */
	private readonly resolvedCache = new Map<string, boolean>();

	constructor() {
		this.diagnosticCollection = VSCode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
	}

	/**
	 * Exposes the diagnostic collection so the caller can register it as a
	 * disposable and so tests can inspect its contents.
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
	 * Clears the file-resolution cache.
	 * Should be called whenever files are added or removed from the workspace
	 * retrieve tree so that subsequent validations re-check the filesystem.
	 */
	clearCache(): void {
		this.resolvedCache.clear();
	}

	/**
	 * Validates all r__TYPE_key and r__type/r__key references in a JSON document
	 * and updates the diagnostic collection accordingly.
	 *
	 * Resolves every referenced file in parallel; for each reference that cannot
	 * be found an Error diagnostic is emitted with the key value as the range.
	 * When all references resolve, the diagnostics for the document are cleared.
	 *
	 * This method is a no-op for files outside the retrieve/<cred>/<bu>/<type>/
	 * path structure or for non-JSON files.
	 *
	 * @param document - The document to validate
	 * @returns Promise that resolves once diagnostics have been updated
	 */
	async validateDocument(document: VSCode.TextDocument): Promise<void> {
		const filePath = document.uri.path;

		if (!filePath.endsWith(".json") || !SUPPORTED_FILE_REGEX.test(filePath)) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		const pathInfo = extractPathInfo(filePath);
		if (!pathInfo) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		const { buPrefix, credPrefix, currentTypeFolder } = pathInfo;
		const isInsideAssetFolder = currentTypeFolder === "asset";
		const text = document.getText();

		// Collect all (type, key, keyStart, keyLength) tuples
		const pending: { type: string; key: string; keyStart: number; keyLength: number }[] = [];

		// Pattern 1 – "r__TYPE_key": "VALUE"
		const p1Regex = new RegExp(R_TYPE_KEY_REGEX.source, "g");
		let match: RegExpExecArray | null;
		while ((match = p1Regex.exec(text)) !== null) {
			const type = match[1];
			const key = match[2];
			pending.push({
				type,
				key,
				keyStart: getTrailingValueStart(match.index, match[0], key),
				keyLength: key.length
			});
		}

		// Pattern 2a – "r__type": "TYPE" ... "r__key": "KEY"  (forward order)
		const p2fRegex = new RegExp(AUTOMATION_FORWARD_REGEX.source, "g");
		while ((match = p2fRegex.exec(text)) !== null) {
			const type = match[1];
			const key = match[2];
			pending.push({
				type,
				key,
				keyStart: getTrailingValueStart(match.index, match[0], key),
				keyLength: key.length
			});
		}

		// Pattern 2b – "r__key": "KEY" ... "r__type": "TYPE"  (reverse order)
		const p2rRegex = new RegExp(AUTOMATION_REVERSE_REGEX.source, "g");
		while ((match = p2rRegex.exec(text)) !== null) {
			const key = match[1];
			const type = match[2];
			pending.push({
				type,
				key,
				keyStart: getLeadingValueStart(match.index, match[0], "r__key"),
				keyLength: key.length
			});
		}

		if (pending.length === 0) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		// cred/bu without the leading "retrieve/" prefix
		const credBu = buPrefix.replace(/^retrieve\//, "");

		// Resolve all in parallel and collect diagnostics for those that fail
		const results = await Promise.all(
			pending.map(async ({ type, key, keyStart, keyLength }) => {
				const exists = await this.resolveExists(type, key, buPrefix, credPrefix, isInsideAssetFolder);
				if (exists) return null;

				const range = new VSCode.Range(
					document.positionAt(keyStart),
					document.positionAt(keyStart + keyLength)
				);
				const diagnostic = new VSCode.Diagnostic(
					range,
					`Related item of type '${type}' with key '${key}' was not found on the BU.`,
					VSCode.DiagnosticSeverity.Error
				);
				diagnostic.source = DIAGNOSTIC_SOURCE;
				// Encode the retrieve coordinates for the code-action provider
				diagnostic.code = JSON.stringify({ credBu, type, key });
				return diagnostic;
			})
		);

		const diagnosticList = results.filter((d): d is VSCode.Diagnostic => d !== null);
		this.diagnosticCollection.set(document.uri, diagnosticList);
	}

	/**
	 * Checks whether the target file exists in the workspace.
	 * Results are cached; false is cached to avoid repeated searches for
	 * consistently-missing files within the same session.
	 *
	 * @param type                - metadata type folder name (e.g. "dataExtension")
	 * @param key                 - item key (e.g. "myKey1")
	 * @param buPrefix            - relative path "retrieve/cred/bu"
	 * @param credPrefix          - relative path "retrieve/cred"
	 * @param isInsideAssetFolder - true when the current file lives in an asset folder
	 * @returns true when the referenced file can be found in the workspace
	 */
	private async resolveExists(
		type: string,
		key: string,
		buPrefix: string,
		credPrefix: string,
		isInsideAssetFolder: boolean
	): Promise<boolean> {
		const cacheKey =
			type === "asset"
				? `${buPrefix}|asset|${key}|${isInsideAssetFolder ? "in" : "out"}`
				: `${buPrefix}|${type}|${key}`;

		if (this.resolvedCache.has(cacheKey)) {
			return this.resolvedCache.get(cacheKey)!;
		}

		let exists = false;

		if (type === "asset") {
			const subtype = isInsideAssetFolder ? "template" : "message";
			const files = await VSCode.workspace.findFiles(
				`${buPrefix}/asset/${subtype}/${key}/${key}.asset-${subtype}-meta.json`
			);
			exists = files.length > 0;
		} else {
			const files = await VSCode.workspace.findFiles(`${buPrefix}/${type}/${key}.${type}-meta.json`);
			if (files.length > 0) {
				exists = true;
			} else if (type === "dataExtension") {
				const parentFiles = await VSCode.workspace.findFiles(
					`${credPrefix}/_ParentBU_/dataExtension/${key}.dataExtension-meta.json`
				);
				exists = parentFiles.length > 0;
			}
		}

		this.resolvedCache.set(cacheKey, exists);
		return exists;
	}
}

export { DIAGNOSTIC_SOURCE };
export default RelatedItemDiagnosticProvider;
