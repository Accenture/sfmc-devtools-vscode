import { VSCode } from "@types";

/**
 * Matches SSJS and AMPscript function calls whose first string argument is a
 * dataExtension name.
 *
 * Handles (case-insensitive):
 *   - Optional `Platform.Function.` prefix (SSJS full-qualified form)
 *   - AMPscript / SSJS functions:
 *       ClaimRow, ClaimRowValue, DataExtension.Init,
 *       DataExtensionRowCount,
 *       DeleteData, DeleteDE, InsertData, InsertDE,
 *       Lookup, LookupOrderedRows, LookupOrderedRowsCS,
 *       LookupRows, LookupRowsCS,
 *       UpdateData, UpdateDE, UpsertData, UpsertDE
 *   - Optional `ENT.` prefix on the DE name (resolved against parent BU)
 *   - Multi-line calls (linebreaks after opening paren, before/after commas)
 *   - Both single-quotes and double-quotes
 *
 * Group 1: "ENT" when the ENT. prefix is present (case-insensitive).
 * Group 2: The dataExtension name (without the ENT. prefix).
 *
 * Examples matched:
 *   Platform.Function.Lookup("MyDE", "Column", "Key", value)
 *   Lookup("MyDE", "Column", "Key", value)
 *   LookupRows('My Data Extension', 'Col', val)
 *   DataExtensionRowCount("MyDE")
 *   platform.function.insertData("MyDE", "Col", val)
 *   InsertDE("MyDE", "Col", val)
 *   ClaimRow("MyDE", "Col", "Key", val)
 *   DataExtension.Init("MyDE")
 *   Lookup("ENT.MyDE", "Col", "Key", val)
 *   LookupRows(\n      'My DE',\n      'Col', val)
 */
const SCRIPT_DE_REGEX =
	/\b(?:Platform\s*\.\s*Function\s*\.\s*)?(?:ClaimRow(?:Value)?|DataExtension\s*\.\s*Init|DataExtensionRowCount|Delete(?:Data|DE)|Insert(?:Data|DE)|Lookup(?:OrderedRows(?:CS)?|Rows(?:CS)?)?|Update(?:Data|DE)|Upsert(?:Data|DE))\s*\(\s*\\?["'](?:(ENT)\s*\.\s*)?([^"'\\]+)\\?["']/gi;

/**
 * Matches SSJS proxy.retrieve() calls that reference a DataExtensionObject
 * by name inside square brackets.
 *
 * Pattern (case-insensitive):
 *   proxy.retrieve('DataExtensionObject[DE Name]', cols, filter)
 *
 * Group 1: The dataExtension name (text inside the brackets).
 *
 * Examples matched:
 *   proxy.retrieve('DataExtensionObject[My DE]', cols, filter)
 *   proxy.retrieve("DataExtensionObject[API_Credentials]", cols, filter)
 *   proxy.retrieve(\n      'DataExtensionObject[My DE]',\n      cols)
 */
const PROXY_DE_REGEX = /\bproxy\s*\.\s*retrieve\s*\(\s*\\?["']DataExtensionObject\[([^\]"']+)\]\\?["']/gi;

/**
 * A dataExtension name reference found in the document text.
 */
interface ScriptDeReference {
	/** The data extension name (without any ENT. prefix). */
	name: string;
	/** True when the name had an ENT. prefix (resolve against parent BU). */
	hasEntPrefix: boolean;
	/** 0-based character offset of the name start in the document text. */
	nameStart: number;
	/** 0-based character offset of the name end in the document text. */
	nameEnd: number;
}

/**
 * Scans the given text for all dataExtension name references using both
 * {@link SCRIPT_DE_REGEX} (SSJS / AMPscript function calls) and
 * {@link PROXY_DE_REGEX} (proxy.retrieve with DataExtensionObject).
 *
 * @param text - Full document text to scan
 * @returns Array of all DE name references found
 */
function findScriptDeReferences(text: string): ScriptDeReference[] {
	const refs: ScriptDeReference[] = [];

	// SSJS / AMPscript function calls (group 1 = ENT, group 2 = name)
	const regex1 = new RegExp(SCRIPT_DE_REGEX.source, "gid");
	let match: RegExpExecArray | null;
	while ((match = regex1.exec(text)) !== null) {
		const name = match[2];
		if (!name) continue;
		const nameIndices = match.indices?.[2];
		const nameStart = nameIndices ? nameIndices[0] : match.index + match[0].lastIndexOf(name);
		const nameEnd = nameIndices ? nameIndices[1] : nameStart + name.length;
		refs.push({ name, hasEntPrefix: match[1] !== undefined, nameStart, nameEnd });
	}

	// proxy.retrieve('DataExtensionObject[DE Name]', ...) (group 1 = name)
	const regex2 = new RegExp(PROXY_DE_REGEX.source, "gid");
	while ((match = regex2.exec(text)) !== null) {
		const name = match[1];
		if (!name) continue;
		const nameIndices = match.indices?.[1];
		const nameStart = nameIndices ? nameIndices[0] : match.index + match[0].lastIndexOf(name);
		const nameEnd = nameIndices ? nameIndices[1] : nameStart + name.length;
		refs.push({ name, hasEntPrefix: false, nameStart, nameEnd });
	}

	return refs;
}

/**
 * Matches file paths inside a retrieve/<cred>/<bu>/ or deploy/<cred>/<bu>/ folder tree.
 * Uses forward slashes because VSCode URI paths are always POSIX-style.
 */
const SUPPORTED_SCRIPT_FILE_REGEX = /\/(?:retrieve|deploy)\/[^/]+\/[^/]+\//;

/**
 * File extensions supported by this provider.
 */
const SUPPORTED_EXTENSIONS = [".amp", ".ssjs", ".html", ".js"];

/**
 * Extracts the BU prefix ("retrieve/cred/bu") and credential prefix
 * ("retrieve/cred") from a file URI path.  Accepts both retrieve/ and deploy/
 * paths but always returns a retrieve/-based buPrefix because the
 * dataExtension metadata files live under retrieve/.
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns buPrefix and credPrefix, or undefined when the path does not match
 *          the expected retrieve/<cred>/<bu>/... or deploy/<cred>/<bu>/... structure.
 */
function extractPathInfo(filePath: string): { buPrefix: string; credPrefix: string } | undefined {
	const match = filePath.match(/\/(?:retrieve|deploy)\/([^/]+)\/([^/]+)\/[^/]+\//);
	if (!match) return undefined;
	return {
		buPrefix: `retrieve/${match[1]}/${match[2]}`, // always "retrieve/cred/bu"
		credPrefix: `retrieve/${match[1]}` // "retrieve/cred"
	};
}

/**
 * Document link provider for dataExtension references inside SSJS / AMPscript
 * files (.amp, .ssjs, .html, .js).
 *
 * Turns dataExtension names that appear as the first string argument of
 * supported SSJS / AMPscript functions (or in proxy.retrieve
 * DataExtensionObject references) into Ctrl+Click navigation links
 * that open the corresponding dataExtension metadata file.
 *
 * Name resolution:
 *   The dataExtension name is resolved against the BU's
 *   retrieve/<cred>/<bu>/dataExtension/ folder by matching
 *   the "Name" field of *.dataExtension-meta.json files.
 *   A fallback lookup against _ParentBU_ is performed as well.
 *
 * Caching strategy:
 *   A per-BU name cache is built lazily the first time a file for a given
 *   BU is opened. Subsequent lookups are pure in-memory (O(1)).
 *
 * @class ScriptDataExtensionLinkProvider
 * @implements {VSCode.DocumentLinkProvider}
 */
class ScriptDataExtensionLinkProvider implements VSCode.DocumentLinkProvider {
	/**
	 * Per-BU in-progress or completed cache promises.
	 * Key:   buPrefix string, e.g. "retrieve/cred/bu" or
	 *        "retrieve/cred/_ParentBU_".
	 * Value: Promise that resolves to Map<lowercaseName → VSCode.Uri>.
	 */
	private readonly cachePromises = new Map<string, Promise<Map<string, VSCode.Uri>>>();

	/**
	 * Clears the per-BU name caches so that subsequent link resolutions
	 * re-scan the file system.  Should be called when dataExtension files
	 * are added, removed, or modified in the workspace.
	 */
	clearCache(): void {
		this.cachePromises.clear();
	}

	/**
	 * Returns the name→URI map for the given BU, building it on first access.
	 * If a previous build failed (rejected promise), the failed entry is
	 * removed so the next call triggers a fresh scan.
	 *
	 * @param buPrefix - relative path "retrieve/cred/bu" or similar
	 * @returns Promise resolving to the name→URI map for that BU
	 */
	private ensureCacheForBU(buPrefix: string): Promise<Map<string, VSCode.Uri>> {
		const existing = this.cachePromises.get(buPrefix);
		if (existing) return existing;

		const promise = this.buildCacheForBU(buPrefix).catch(err => {
			// Don't permanently cache a failed scan — allow retry on next access
			this.cachePromises.delete(buPrefix);
			throw err;
		});
		this.cachePromises.set(buPrefix, promise);
		return promise;
	}

	/**
	 * Scans all *.dataExtension-meta.json files in a BU folder, reads their
	 * "Name" fields, and returns the populated name→URI map.
	 *
	 * @param buPrefix - relative path "retrieve/cred/bu" or similar
	 * @returns Promise resolving to the completed name→URI map
	 */
	private async buildCacheForBU(buPrefix: string): Promise<Map<string, VSCode.Uri>> {
		const cache = new Map<string, VSCode.Uri>();
		const files = await VSCode.workspace.findFiles(`${buPrefix}/dataExtension/*.dataExtension-meta.json`);
		await Promise.all(files.map(uri => this.indexFile(uri, cache)));
		return cache;
	}

	/**
	 * Reads one dataExtension-meta.json file and adds its "Name" → URI
	 * mapping to the provided cache.  Silently ignores files that cannot
	 * be read or do not contain a string "Name" field.
	 *
	 * @param uri   - URI of the dataExtension-meta.json file
	 * @param cache - destination map to populate
	 */
	private async indexFile(uri: VSCode.Uri, cache: Map<string, VSCode.Uri>): Promise<void> {
		try {
			const bytes = await VSCode.workspace.fs.readFile(uri);
			const text = Buffer.from(bytes).toString("utf8");
			const json: unknown = JSON.parse(text);
			if (json && typeof json === "object" && !Array.isArray(json)) {
				const record = json as Record<string, unknown>;
				const name = typeof record["Name"] === "string" ? record["Name"] : undefined;
				if (name) {
					cache.set(name.toLowerCase(), uri);
				}
			}
		} catch {
			// Ignore files that cannot be read or contain invalid JSON
		}
	}

	/**
	 * Provides document links for all dataExtension name references found in
	 * SSJS / AMPscript function calls and proxy.retrieve DataExtensionObject
	 * references.
	 *
	 * Returns an empty array for files that are not .amp/.ssjs/.html/.js files
	 * located inside a retrieve/<cred>/<bu>/ folder.
	 *
	 * @param document - The document being scanned
	 * @returns Promise resolving to an array of document links
	 */
	async provideDocumentLinks(document: VSCode.TextDocument): Promise<VSCode.DocumentLink[]> {
		const filePath = document.uri.path;

		// Only process supported file extensions inside retrieve/<cred>/<bu>/ paths
		if (!SUPPORTED_EXTENSIONS.some(ext => filePath.endsWith(ext)) || !SUPPORTED_SCRIPT_FILE_REGEX.test(filePath)) {
			return [];
		}

		const pathInfo = extractPathInfo(filePath);
		if (!pathInfo) return [];

		const { buPrefix, credPrefix } = pathInfo;
		const parentBuPrefix = `${credPrefix}/_ParentBU_`;

		// Ensure name caches are ready for both the current BU and the parent BU
		const [buCache, parentCache] = await Promise.all([
			this.ensureCacheForBU(buPrefix),
			this.ensureCacheForBU(parentBuPrefix)
		]);

		const text = document.getText();
		const links: VSCode.DocumentLink[] = [];

		for (const ref of findScriptDeReferences(text)) {
			// ENT.-prefixed names resolve against parent BU; plain names against current BU first
			const uri = ref.hasEntPrefix
				? parentCache.get(ref.name.toLowerCase())
				: (buCache.get(ref.name.toLowerCase()) ?? parentCache.get(ref.name.toLowerCase()));
			if (!uri) continue;

			const range = new VSCode.Range(document.positionAt(ref.nameStart), document.positionAt(ref.nameEnd));
			links.push(new VSCode.DocumentLink(range, uri));
		}

		return links;
	}
}

export { SCRIPT_DE_REGEX, SUPPORTED_SCRIPT_FILE_REGEX, SUPPORTED_EXTENSIONS, findScriptDeReferences };
export default ScriptDataExtensionLinkProvider;
