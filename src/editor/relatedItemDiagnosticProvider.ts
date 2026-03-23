import { VSCode } from "@types";
import { R_TYPE_KEY_REGEX, AUTOMATION_FORWARD_REGEX, AUTOMATION_REVERSE_REGEX } from "./relatedItemLinkProvider";

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
 * @returns projectPath (everything before the retrieve segment),
 *          buPrefix ("retrieve/cred/bu"), credPrefix ("retrieve/cred"),
 *          and currentTypeFolder (the immediate metadata-type folder name),
 *          or undefined when the path does not match the expected structure.
 */
function extractPathInfo(filePath: string):
	| {
			projectPath: string;
			buPrefix: string;
			credPrefix: string;
			currentTypeFolder: string;
	  }
	| undefined {
	// Captures: (1) project root, (2) retrieve/cred/bu, (3) cred, (4) typeFolder
	const match = filePath.match(/^(.*)\/(retrieve\/([^/]+)\/[^/]+)\/([^/]+)\//);
	if (!match) return undefined;
	return {
		projectPath: match[1], // e.g. "/workspace/my-project"
		buPrefix: match[2], // "retrieve/cred/bu"
		credPrefix: `retrieve/${match[3]}`, // "retrieve/cred"
		currentTypeFolder: match[4] // e.g. "dataExtension"
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
 * Severity rules:
 *   • If the metadata type folder (`retrieve/cred/bu/<type>/`) does not exist
 *     at all, a **Warning** is emitted – the type has simply never been retrieved.
 *   • If the folder exists but the specific key file is absent, a **Warning** is
 *     also emitted – the key is not locally present but may exist on the BU.
 *   • If the caller-supplied `typeFilter` returns false for a given type the
 *     reference is silently ignored (no diagnostic produced).  The filter is
 *     used to suppress diagnostics for types that the user has not configured
 *     for retrieval (not in `metaDataTypes.retrieve` in `.mcdevrc.json`) or
 *     for which `deploy` is not supported.
 *
 * Resolved paths are cached; both caches are cleared via `clearCache()`.
 *
 * @class RelatedItemDiagnosticProvider
 */
class RelatedItemDiagnosticProvider {
	/**
	 * VS Code diagnostic collection that populates the Problems panel and
	 * marks files red/yellow in the Explorer.
	 */
	private readonly diagnosticCollection: VSCode.DiagnosticCollection;

	/**
	 * Cache for specific-key file lookups.
	 * Key format: "buPrefix|type|key" (or "buPrefix|asset|key|in/out")
	 * Value: true when the file exists, false when it does not.
	 */
	private readonly resolvedCache = new Map<string, boolean>();

	/**
	 * Cache for type-folder existence checks.
	 * Key format: "buPrefix|type"
	 * Value: true when the type folder contains at least one file.
	 */
	private readonly typeFolderCache = new Map<string, boolean>();

	/**
	 * Optional caller-supplied predicate.
	 * When provided and returning false for a (type, projectPath) pair, the
	 * diagnostic provider skips that reference entirely (no diagnostic emitted).
	 */
	private readonly typeFilter: (type: string, projectPath: string) => boolean;

	/**
	 * @param typeFilter - Optional predicate; when it returns false the reference
	 *   is ignored and no diagnostic is produced.  Defaults to always-true.
	 */
	constructor(typeFilter?: (type: string, projectPath: string) => boolean) {
		this.diagnosticCollection = VSCode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
		this.typeFilter = typeFilter ?? (() => true);
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
	 * Clears both the file-resolution and type-folder caches.
	 * Should be called whenever files are added or removed from the workspace
	 * retrieve tree so that subsequent validations re-check the filesystem.
	 */
	clearCache(): void {
		this.resolvedCache.clear();
		this.typeFolderCache.clear();
	}

	/**
	 * Validates all r__TYPE_key and r__type/r__key references in a JSON document
	 * and updates the diagnostic collection accordingly.
	 *
	 * For each reference whose `typeFilter` passes:
	 *   • Missing type folder → Warning
	 *   • Existing type folder but missing key → Warning
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

		const { projectPath, buPrefix, credPrefix, currentTypeFolder } = pathInfo;
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

		// Resolve all in parallel and collect diagnostics
		const results = await Promise.all(
			pending.map(async ({ type, key, keyStart, keyLength }) => {
				// Skip if the caller decided this type should not be validated
				if (!this.typeFilter(type, projectPath)) return null;

				const range = new VSCode.Range(
					document.positionAt(keyStart),
					document.positionAt(keyStart + keyLength)
				);

				// Determine severity: Warning if the type folder is absent,
				// Error if the folder exists but the specific key is missing.
				const folderExists = await this.checkTypeFolderExists(type, buPrefix);
				if (!folderExists) {
					const diagnostic = new VSCode.Diagnostic(
						range,
						`Related item of type '${type}' with key '${key}' cannot be verified: the type folder has not been retrieved yet.`,
						VSCode.DiagnosticSeverity.Warning
					);
					diagnostic.source = DIAGNOSTIC_SOURCE;
					diagnostic.code = {
						value: "warnOnMissingJsonRelation",
						target: VSCode.Uri.parse(
							`vscode://settings/${DIAGNOSTIC_SOURCE}.warnOnMissingJsonRelation?credBu=${encodeURIComponent(credBu)}&type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`
						)
					};
					return diagnostic;
				}

				const keyExists = await this.resolveKeyExists(type, key, buPrefix, credPrefix, isInsideAssetFolder);
				if (keyExists) return null;

				const diagnostic = new VSCode.Diagnostic(
					range,
					`Related item of type '${type}' with key '${key}' was not found on the BU.`,
					VSCode.DiagnosticSeverity.Warning
				);
				diagnostic.source = DIAGNOSTIC_SOURCE;
				diagnostic.code = {
					value: "warnOnMissingJsonRelation",
					target: VSCode.Uri.parse(
						`vscode://settings/${DIAGNOSTIC_SOURCE}.warnOnMissingJsonRelation?credBu=${encodeURIComponent(credBu)}&type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`
					)
				};
				return diagnostic;
			})
		);

		const diagnosticList = results.filter((d): d is VSCode.Diagnostic => d !== null);
		this.diagnosticCollection.set(document.uri, diagnosticList);
	}

	/**
	 * Checks whether the type folder contains at least one file.
	 * Results are cached so subsequent lookups for the same type/BU are instant.
	 *
	 * @param type     - metadata type folder name (e.g. "dataExtension")
	 * @param buPrefix - relative path "retrieve/cred/bu"
	 * @returns true when the type folder exists and is non-empty
	 */
	private async checkTypeFolderExists(type: string, buPrefix: string): Promise<boolean> {
		const cacheKey = `${buPrefix}|${type}`;
		if (this.typeFolderCache.has(cacheKey)) {
			return this.typeFolderCache.get(cacheKey)!;
		}
		const files = await VSCode.workspace.findFiles(`${buPrefix}/${type}/**`, undefined, 1);
		const exists = files.length > 0;
		this.typeFolderCache.set(cacheKey, exists);
		return exists;
	}

	/**
	 * Checks whether the specific key file exists in the workspace.
	 * Results are cached; false is cached to avoid repeated searches.
	 *
	 * @param type                - metadata type folder name (e.g. "dataExtension")
	 * @param key                 - item key (e.g. "myKey1")
	 * @param buPrefix            - relative path "retrieve/cred/bu"
	 * @param credPrefix          - relative path "retrieve/cred"
	 * @param isInsideAssetFolder - true when the current file lives in an asset folder
	 * @returns true when the referenced file can be found in the workspace
	 */
	private async resolveKeyExists(
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

export { DIAGNOSTIC_SOURCE, extractPathInfo as extractRelatedItemPathInfo };
export default RelatedItemDiagnosticProvider;
