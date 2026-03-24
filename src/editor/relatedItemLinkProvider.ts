import { VSCode } from "@types";

/**
 * Matches "r__TYPE_key": "VALUE" patterns in JSON files.
 *
 * Group 1: TYPE  — the metadata folder name (e.g. "dataExtension", "importFile")
 * Group 2: VALUE — the key of the referenced item (e.g. "myKey1")
 *
 * Examples:
 *   "r__dataExtension_key": "myKey1"
 *   "r__importFile_key": "myKey2"
 *   "r__asset_key": "myAssetKey"
 */
const R_TYPE_KEY_REGEX = /"r__(\w+)_key"\s*:\s*"([^"]+)"/g;

/**
 * Matches automation-style r__type / r__key pairs where r__type appears first.
 * Both fields must reside in the same JSON object (no { or } allowed between them).
 *
 * Group 1: type value (e.g. "query", "dataExtract", "fileTransfer")
 * Group 2: key value  (e.g. "ActivityKey1")
 *
 * Example:
 *   { "r__type": "query", "r__key": "ActivityKey1" }
 */
const AUTOMATION_FORWARD_REGEX = /"r__type"\s*:\s*"([^"]+)"[^{}]*?"r__key"\s*:\s*"([^"]+)"/g;

/**
 * Matches automation-style r__key / r__type pairs where r__key appears first.
 * Both fields must reside in the same JSON object (no { or } allowed between them).
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
	// Captures: (1) retrieve/cred/bu, (2) cred, (3) currentTypeFolder
	const match = filePath.match(/\/(retrieve\/([^/]+)\/[^/]+)\/([^/]+)\//);
	if (!match) return undefined;
	return {
		buPrefix: match[1], // "retrieve/cred/bu"
		credPrefix: `retrieve/${match[2]}`, // "retrieve/cred"
		currentTypeFolder: match[3] // e.g. "dataExtension"
	};
}

/**
 * Returns the absolute document offset of the last-captured group value when
 * the value appears at the very end of the matched string, just before its
 * closing double-quote.
 *
 * This is used for:
 *   "r__TYPE_key": "VALUE"         (Pattern 1,   last group = VALUE)
 *   "r__type": "T" ... "r__key": "KEY"  (Pattern 2 forward, last group = KEY)
 *
 * @param matchIndex - match.index (start of match in document text)
 * @param matchStr   - match[0]   (full matched string)
 * @param value      - last captured group string
 */
function getTrailingValueStart(matchIndex: number, matchStr: string, value: string): number {
	// match[0] ends with: ..."VALUE"
	// Position of first char of VALUE = length - value.length - 1 (skip closing ")
	return matchIndex + matchStr.length - value.length - 1;
}

/**
 * Returns the absolute document offset of the first-captured group value when
 * it appears at the very beginning of the matched string.
 *
 * This is used for Pattern 2 reverse: "r__key": "KEY" ... "r__type": "TYPE"
 * where KEY is in the first capture group.
 *
 * @param matchIndex - match.index
 * @param matchStr   - match[0]
 * @param fieldName  - the JSON field name whose value we want (e.g. "r__key")
 */
function getLeadingValueStart(matchIndex: number, matchStr: string, fieldName: string): number {
	// match[0] starts with: "fieldName"\s*:\s*"VALUE"...
	// Find the first " that opens the value, which is after the field name and its closing ".
	const fieldWithQuotes = `"${fieldName}"`;
	const openingQuoteOffset = matchStr.indexOf('"', fieldWithQuotes.length);
	return matchIndex + openingQuoteOffset + 1;
}

/**
 * Document link provider for r__TYPE_key relation fields in SFMC JSON metadata.
 *
 * Turns the string values of relation fields into Ctrl+Click navigation links
 * that open the referenced metadata file inside the same retrieve/cred/bu tree.
 *
 * Two patterns are supported:
 *
 * 1. Named-type pattern (used everywhere except automation steps):
 *      "r__dataExtension_key": "myKey1"
 *    → opens  retrieve/cred/bu/dataExtension/myKey1.dataExtension-meta.json
 *
 * 2. Automation step pattern (r__type + r__key in same JSON object):
 *      { "r__type": "query", "r__key": "ActivityKey1" }
 *    → opens  retrieve/cred/bu/query/ActivityKey1.query-meta.json
 *
 * Special cases:
 *   • r__asset_key outside an asset folder
 *       → asset/message/<key>/<key>.asset-message-meta.json
 *   • r__asset_key inside an asset folder
 *       → asset/template/<key>/<key>.asset-template-meta.json
 *   • r__dataExtension_key not found in the current BU
 *       → also tries retrieve/cred/_ParentBU_/dataExtension/<key>.dataExtension-meta.json
 *
 * Links are resolved on demand (no pre-scan at startup) and cached after
 * the first successful lookup so that re-opening the same file is instant.
 *
 * Only active for .json files under retrieve/<cred>/<bu>/<type>/ paths.
 *
 * @class RelatedItemLinkProvider
 * @implements {VSCode.DocumentLinkProvider}
 */
class RelatedItemLinkProvider implements VSCode.DocumentLinkProvider {
	/**
	 * Cache of previously resolved file paths.
	 * Key format:
	 *   • Standard types:  "buPrefix|type|key"
	 *   • Asset type:      "buPrefix|asset|key|in" or "buPrefix|asset|key|out"
	 * Value is the resolved URI, or null when the file was not found.
	 */
	private readonly resolvedCache = new Map<string, VSCode.Uri | null>();

	/**
	 * Resolves the URI for a referenced metadata file.
	 * Results are cached; null is cached to avoid repeated filesystem searches
	 * for missing files.
	 *
	 * @param type                - metadata type folder name (e.g. "dataExtension")
	 * @param key                 - item key (e.g. "myKey1")
	 * @param buPrefix            - relative path "retrieve/cred/bu"
	 * @param credPrefix          - relative path "retrieve/cred"
	 * @param isInsideAssetFolder - true when the current file lives in an asset folder
	 * @returns resolved URI, or null when the file cannot be found in the workspace
	 */
	private async resolveLink(
		type: string,
		key: string,
		buPrefix: string,
		credPrefix: string,
		isInsideAssetFolder: boolean
	): Promise<VSCode.Uri | null> {
		const cacheKey =
			type === "asset"
				? `${buPrefix}|asset|${key}|${isInsideAssetFolder ? "in" : "out"}`
				: `${buPrefix}|${type}|${key}`;

		if (this.resolvedCache.has(cacheKey)) {
			return this.resolvedCache.get(cacheKey) ?? null;
		}

		let uri: VSCode.Uri | null = null;

		if (type === "asset") {
			// Asset files use a subfolder per key and a subtype-dependent path
			const subtype = isInsideAssetFolder ? "template" : "message";
			const files = await VSCode.workspace.findFiles(
				`${buPrefix}/asset/${subtype}/${key}/${key}.asset-${subtype}-meta.json`
			);
			if (files.length > 0) uri = files[0];
		} else {
			// Standard pattern: TYPE/key.TYPE-meta.json
			const files = await VSCode.workspace.findFiles(`${buPrefix}/${type}/${key}.${type}-meta.json`);
			if (files.length > 0) {
				uri = files[0];
			} else if (type === "dataExtension") {
				// Shared/synchronised dataExtensions may live in _ParentBU_
				const parentFiles = await VSCode.workspace.findFiles(
					`${credPrefix}/_ParentBU_/dataExtension/${key}.dataExtension-meta.json`
				);
				if (parentFiles.length > 0) uri = parentFiles[0];
			}
		}

		this.resolvedCache.set(cacheKey, uri);
		return uri;
	}

	/**
	 * Provides document links for all r__TYPE_key and r__type/r__key occurrences
	 * in a JSON metadata file.
	 *
	 * Links are resolved on demand; results are cached after the first lookup.
	 *
	 * Returns an empty array for files outside the
	 * retrieve/<cred>/<bu>/<type>/ path structure or for non-JSON files.
	 *
	 * @param document - The document being scanned
	 * @returns Promise resolving to an array of document links
	 */
	async provideDocumentLinks(document: VSCode.TextDocument): Promise<VSCode.DocumentLink[]> {
		const filePath = document.uri.path;

		// Only process JSON files inside retrieve/cred/bu/type/ trees
		if (!filePath.endsWith(".json") || !SUPPORTED_FILE_REGEX.test(filePath)) return [];

		const pathInfo = extractPathInfo(filePath);
		if (!pathInfo) return [];

		const { buPrefix, credPrefix, currentTypeFolder } = pathInfo;
		const isInsideAssetFolder = currentTypeFolder === "asset";
		const text = document.getText();

		// Collect all (type, key, keyStart, keyLength) tuples before resolving
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

		if (pending.length === 0) return [];

		// Resolve all links in parallel, dropping any that cannot be found
		const results = await Promise.all(
			pending.map(async ({ type, key, keyStart, keyLength }) => {
				const uri = await this.resolveLink(type, key, buPrefix, credPrefix, isInsideAssetFolder);
				if (!uri) return null;
				const range = new VSCode.Range(
					document.positionAt(keyStart),
					document.positionAt(keyStart + keyLength)
				);
				return new VSCode.DocumentLink(range, uri);
			})
		);

		return results.filter((l): l is VSCode.DocumentLink => l !== null);
	}
}

export { R_TYPE_KEY_REGEX, AUTOMATION_FORWARD_REGEX, AUTOMATION_REVERSE_REGEX };
export default RelatedItemLinkProvider;
