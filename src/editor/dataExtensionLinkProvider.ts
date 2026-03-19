import { VSCode } from "@types";

/**
 * Matches SQL FROM / JOIN clauses (including all common JOIN variants) that
 * reference a dataExtension table name.
 *
 * Handles:
 *   FROM, JOIN, INNER JOIN, LEFT JOIN, RIGHT JOIN, CROSS JOIN,
 *   FULL JOIN, LEFT OUTER JOIN, RIGHT OUTER JOIN, FULL OUTER JOIN
 *
 * Group 1: "ENT" when the ENT. prefix is present (case-insensitive match,
 *          always stored as the literal characters from the source).
 * Group 2: Name inside square brackets, e.g. "My DE Name" from [My DE Name].
 * Group 3: Bare identifier name, e.g. "MyDE" (no brackets, no spaces).
 *
 * Examples matched:
 *   FROM  MyDataExtension
 *   FROM  [My Data Extension]
 *   FROM  ENT.MyDataExtension
 *   FROM  ent.[My Data Extension]
 *   JOIN  AnotherDE
 *   LEFT JOIN [Shared DE]
 *   INNER JOIN ENT.MyDE
 *   LEFT OUTER JOIN [My Parent DE]
 */
const SQL_DE_REGEX =
	/\b(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+(?:(ENT)\s*\.\s*)?(?:\[([^\]]+)\]|([A-Za-z_]\w*))/gi;

/**
 * Matches the FROM / JOIN keyword prefix (including all join variants) at the
 * start of a SQL_DE_REGEX match, up to and including the trailing whitespace.
 * Used to compute the start of the clickable DE name within a regex match.
 */
const SQL_FROM_JOIN_PREFIX_REGEX = /^(?:FROM|(?:(?:INNER|LEFT|RIGHT|CROSS|FULL)\s+)?(?:OUTER\s+)?JOIN)\s+/i;

/**
 * Matches SQL file paths that are inside a retrieve/<cred>/<bu>/query/ folder.
 * Uses forward slashes because VSCode URI paths are always POSIX-style.
 */
const SUPPORTED_SQL_FILE_REGEX = /\/retrieve\/[^/]+\/[^/]+\/query\//;

/**
 * Extracts the BU prefix ("retrieve/cred/bu") and credential prefix
 * ("retrieve/cred") from a file URI path.
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns buPrefix and credPrefix, or undefined when the path does not match
 *          the expected retrieve/<cred>/<bu>/... structure.
 */
function extractPathInfo(filePath: string): { buPrefix: string; credPrefix: string } | undefined {
	const match = filePath.match(/\/(retrieve\/([^/]+)\/[^/]+)\/[^/]+\//);
	if (!match) return undefined;
	return {
		buPrefix: match[1], // "retrieve/cred/bu"
		credPrefix: `retrieve/${match[2]}` // "retrieve/cred"
	};
}

/**
 * Document link provider for dataExtension references inside SQL query files.
 *
 * Turns dataExtension names that appear in FROM / JOIN clauses of
 * retrieve/<cred>/<bu>/query/*.sql files into Ctrl+Click navigation links
 * that open the corresponding dataExtension metadata file.
 *
 * Name resolution:
 *   • Plain name (e.g. "MyDE" or "[My DE]")
 *       → retrieve/<cred>/<bu>/dataExtension/<key>.dataExtension-meta.json
 *         where the file's "Name" field equals "MyDE" / "My DE".
 *   • ENT.-prefixed name (e.g. "ENT.MyDE" or "ENT.[My DE]", case-insensitive)
 *       → retrieve/<cred>/_ParentBU_/dataExtension/<key>.dataExtension-meta.json
 *         (shared / synchronised dataExtension from the parent BU).
 *
 * Caching strategy:
 *   The first time a query file for a given BU is opened, all
 *   dataExtension-meta.json files in that BU's dataExtension folder are
 *   scanned and their "Name" fields are indexed into an in-memory map.
 *   Subsequent link resolutions are pure in-memory lookups (O(1)).
 *   Each BU folder gets its own independent cache so that caches for
 *   different BUs do not interfere with each other.
 *
 * @class DataExtensionLinkProvider
 * @implements {VSCode.DocumentLinkProvider}
 */
class DataExtensionLinkProvider implements VSCode.DocumentLinkProvider {
	/**
	 * Per-BU in-progress or completed cache promises.
	 * Key:   buPrefix string, e.g. "retrieve/cred/bu" or
	 *        "retrieve/cred/_ParentBU_".
	 * Value: Promise that resolves to Map<lowercaseName → VSCode.Uri> built
	 *        from the "Name" field of every *.dataExtension-meta.json file
	 *        found under that BU.
	 *
	 * Storing the Promise (rather than the Map directly) prevents concurrent
	 * callers for the same BU from each starting their own scan: the second
	 * caller simply awaits the already-started promise.
	 */
	private readonly cachePromises = new Map<string, Promise<Map<string, VSCode.Uri>>>();

	/**
	 * Returns the name→URI map for the given BU, building it on first access.
	 *
	 * All *.dataExtension-meta.json files under
	 * <buPrefix>/dataExtension/ are read and their "Name" field is indexed.
	 * The resulting Promise is stored so that concurrent calls for the same
	 * BU share the same scan rather than each starting their own.
	 *
	 * @param buPrefix - relative path "retrieve/cred/bu" or similar
	 * @returns Promise resolving to the name→URI map for that BU
	 */
	private ensureCacheForBU(buPrefix: string): Promise<Map<string, VSCode.Uri>> {
		const existing = this.cachePromises.get(buPrefix);
		if (existing) return existing;

		const promise = this.buildCacheForBU(buPrefix);
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
	 * FROM / JOIN clauses of a SQL query file.
	 *
	 * Returns an empty array for files that are not .sql files located inside
	 * a retrieve/<cred>/<bu>/query/ folder.
	 *
	 * The BU name cache is populated lazily on first call for a given BU.
	 *
	 * @param document - The document being scanned
	 * @returns Promise resolving to an array of document links
	 */
	async provideDocumentLinks(document: VSCode.TextDocument): Promise<VSCode.DocumentLink[]> {
		const filePath = document.uri.path;

		// Only process .sql files inside retrieve/<cred>/<bu>/query/ paths
		if (!filePath.endsWith(".sql") || !SUPPORTED_SQL_FILE_REGEX.test(filePath)) return [];

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
		const regex = new RegExp(SQL_DE_REGEX.source, "gi");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const hasEntPrefix = match[1] !== undefined;
			// Group 2: bracketed name; Group 3: bare identifier
			const name = match[2] ?? match[3];
			if (!name) continue;

			const cache = hasEntPrefix ? parentCache : buCache;
			const uri = cache.get(name.toLowerCase());
			if (!uri) continue;

			// The clickable range starts right after the FROM / JOIN keyword
			// (including any INNER/LEFT/RIGHT/... variant and trailing spaces)
			// and ends at the last character of the match.
			// It covers: [ENT.][name] or [ENT.][bracketed name].
			const fromJoinLen = match[0].match(SQL_FROM_JOIN_PREFIX_REGEX)?.[0].length ?? 0;
			const linkStart = match.index + fromJoinLen;
			const linkEnd = match.index + match[0].length;

			const range = new VSCode.Range(document.positionAt(linkStart), document.positionAt(linkEnd));
			links.push(new VSCode.DocumentLink(range, uri));
		}

		return links;
	}
}

export default DataExtensionLinkProvider;
