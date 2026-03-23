import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";
import { SCRIPT_DE_REGEX, SUPPORTED_SCRIPT_FILE_REGEX, SUPPORTED_EXTENSIONS } from "./scriptDataExtensionLinkProvider";

/**
 * Diagnostic code value used by both the diagnostic provider and the
 * code-action provider to correlate diagnostics with quick fixes.
 */
const DIAGNOSTIC_CODE_SCRIPT = "warnOnMissingScriptDataExtension";

/**
 * Extracts the BU prefix ("retrieve/cred/bu"), credential prefix
 * ("retrieve/cred"), and "cred/bu" from a file URI path.  Accepts both
 * retrieve/ and deploy/ paths but always returns a retrieve/-based buPrefix
 * because the dataExtension metadata files live under retrieve/.
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns buPrefix, credPrefix, and credBu, or undefined when the path
 *          does not match the expected retrieve/<cred>/<bu>/... or
 *          deploy/<cred>/<bu>/... structure.
 */
function extractPathInfo(filePath: string): { buPrefix: string; credPrefix: string; credBu: string } | undefined {
	const match = filePath.match(/\/(?:retrieve|deploy)\/([^/]+\/[^/]+)\/[^/]+\//);
	if (!match) return undefined;
	return {
		buPrefix: `retrieve/${match[1]}`, // always "retrieve/cred/bu"
		credPrefix: `retrieve/${match[1].split("/")[0]}`, // "retrieve/cred"
		credBu: match[1] // "cred/bu"
	};
}

/**
 * Diagnostic provider for SSJS / AMPscript files (.amp, .ssjs, .html)
 * inside the retrieve/ folder tree.
 *
 * Scans supported function calls for dataExtension name references and
 * classifies each:
 *   • Data extension found in the BU's dataExtension folder → no diagnostic.
 *   • Unresolvable name → Warning diagnostic whose code carries the cred/bu
 *     and name so that {@link ScriptCodeActionProvider} can offer a "Retrieve"
 *     quick fix.
 *
 * Name resolution mirrors {@link ScriptDataExtensionLinkProvider}: a per-BU
 * cache of lowercased "Name" fields is lazily built from
 * retrieve/<cred>/<bu>/dataExtension/*.dataExtension-meta.json files.
 *
 * @class ScriptDiagnosticProvider
 */
class ScriptDiagnosticProvider {
	/**
	 * VS Code diagnostic collection that populates the Problems panel.
	 */
	private readonly diagnosticCollection: VSCode.DiagnosticCollection;

	/**
	 * Per-BU cache of lowercased data-extension names.
	 * Key:   buPrefix (e.g. "retrieve/cred/bu")
	 * Value: Promise resolving to a Set of lowercased DE names.
	 */
	private readonly cachePromises = new Map<string, Promise<Set<string>>>();

	constructor() {
		this.diagnosticCollection = VSCode.languages.createDiagnosticCollection(
			`${DIAGNOSTIC_SOURCE}.scriptDataExtension`
		);
	}

	/**
	 * Returns the name-set for the given BU, building it on first access.
	 *
	 * @param buPrefix - relative path "retrieve/cred/bu" or similar
	 * @returns Promise resolving to a Set of lowercased DE names
	 */
	private ensureCacheForBU(buPrefix: string): Promise<Set<string>> {
		const existing = this.cachePromises.get(buPrefix);
		if (existing) return existing;

		const promise = this.buildCacheForBU(buPrefix);
		this.cachePromises.set(buPrefix, promise);
		return promise;
	}

	/**
	 * Scans all *.dataExtension-meta.json files in a BU folder, reads their
	 * "Name" fields, and returns the populated name set.
	 *
	 * @param buPrefix - relative path "retrieve/cred/bu" or similar
	 * @returns Promise resolving to the completed name set
	 */
	private async buildCacheForBU(buPrefix: string): Promise<Set<string>> {
		const names = new Set<string>();
		const files = await VSCode.workspace.findFiles(`${buPrefix}/dataExtension/*.dataExtension-meta.json`);
		await Promise.all(
			files.map(async (uri: VSCode.Uri) => {
				try {
					const bytes = await VSCode.workspace.fs.readFile(uri);
					const text = Buffer.from(bytes).toString("utf8");
					const json: unknown = JSON.parse(text);
					if (json && typeof json === "object" && !Array.isArray(json)) {
						const record = json as Record<string, unknown>;
						const name = typeof record["Name"] === "string" ? record["Name"] : undefined;
						if (name) {
							names.add(name.toLowerCase());
						}
					}
				} catch {
					// Ignore files that cannot be read or contain invalid JSON
				}
			})
		);
		return names;
	}

	/**
	 * Clears the per-BU name caches so that subsequent validations re-scan
	 * the file system.  Should be called when dataExtension files are
	 * added, removed, or modified in the workspace.
	 */
	clearCache(): void {
		this.cachePromises.clear();
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
	 * Validates all dataExtension references in an SSJS / AMPscript document
	 * and updates the diagnostic collection.
	 *
	 * @param document - The document to validate
	 * @returns Promise that resolves once diagnostics have been updated
	 */
	async validateDocument(document: VSCode.TextDocument): Promise<void> {
		const filePath = document.uri.path;

		// Only process supported file extensions inside retrieve/<cred>/<bu>/
		if (!SUPPORTED_EXTENSIONS.some(ext => filePath.endsWith(ext)) || !SUPPORTED_SCRIPT_FILE_REGEX.test(filePath)) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		const pathInfo = extractPathInfo(filePath);
		if (!pathInfo) {
			this.diagnosticCollection.delete(document.uri);
			return;
		}

		const { buPrefix, credPrefix, credBu } = pathInfo;
		const parentBuPrefix = `${credPrefix}/_ParentBU_`;

		// Ensure name caches are ready for both the current BU and the parent BU
		const [buCache, parentCache] = await Promise.all([
			this.ensureCacheForBU(buPrefix),
			this.ensureCacheForBU(parentBuPrefix)
		]);

		const text = document.getText();
		const diagnostics: VSCode.Diagnostic[] = [];
		const regex = new RegExp(SCRIPT_DE_REGEX.source, "gi");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const hasEntPrefix = match[1] !== undefined;
			const name = match[2];
			if (!name) continue;

			const lowerName = name.toLowerCase();

			// Make the range cover only the DE name inside the quotes
			const nameOffset = match.index + match[0].indexOf(name);
			const range = new VSCode.Range(
				document.positionAt(nameOffset),
				document.positionAt(nameOffset + name.length)
			);

			// Resolve against both the BU cache and the parent BU cache
			if (hasEntPrefix) {
				// ENT.-prefixed names belong to the parent BU
				if (parentCache.has(lowerName)) continue;
			} else {
				if (buCache.has(lowerName)) continue;
				if (parentCache.has(lowerName)) continue;
			}

			// Not found → Warning with quickfix metadata
			// ENT.-prefixed names belong to the parent BU, so the retrieve
			// should target cred/_ParentBU_ rather than the current BU.
			const retrieveCredBu = hasEntPrefix ? `${credBu.split("/")[0]}/_ParentBU_` : credBu;
			const diagnostic = new VSCode.Diagnostic(
				range,
				`Data extension '${name}' cannot be resolved: it was not found in the retrieve tree.`,
				VSCode.DiagnosticSeverity.Warning
			);
			diagnostic.source = DIAGNOSTIC_SOURCE;
			diagnostic.code = {
				value: DIAGNOSTIC_CODE_SCRIPT,
				target: VSCode.Uri.parse(
					`vscode://settings/${DIAGNOSTIC_SOURCE}.${DIAGNOSTIC_CODE_SCRIPT}?credBu=${encodeURIComponent(retrieveCredBu)}&name=${encodeURIComponent(name)}`
				)
			};
			diagnostics.push(diagnostic);
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}
}

export { DIAGNOSTIC_CODE_SCRIPT };
export default ScriptDiagnosticProvider;
