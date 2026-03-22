import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";
import { SQL_DE_REGEX, SQL_FROM_JOIN_PREFIX_REGEX, SUPPORTED_SQL_FILE_REGEX } from "./dataExtensionLinkProvider";

/**
 * Diagnostic code value used by both the diagnostic provider and the
 * code-action provider to correlate diagnostics with quick fixes.
 */
const DIAGNOSTIC_CODE_SQL = "warnOnMissingSqlDataExtension";

/**
 * Known SFMC system data views mapped by their lowercased name to a
 * human-readable description. These tables exist on every account and
 * cannot be retrieved via mcdev.
 */
const DATA_VIEWS: ReadonlyMap<string, string> = new Map([
	// Email Data Views
	["_sent", "Data on every email sent."],
	["_open", "Tracking data for email opens."],
	["_click", "Detailed data on link clicks."],
	["_bounce", "Information on undeliverable emails."],
	["_unsubscribe", "Records of unsubscribe link clicks."],
	["_complaint", 'Records of "Report Spam" actions.'],
	["_ftaf", '"Forward to a Friend" activity data.'],
	["_businessunitunsubscribes", "Unsubscribes tracked at the Business Unit level."],
	["_job", "Metadata about specific email send jobs."],
	["_surveyresponse", "Responses to legacy email surveys."],
	["_socialnetworkimpressions", "Tracking for social sharing impressions."],
	["_socialnetworktracking", "Detailed social sharing engagement data."],
	["_coupon", "Details on coupon codes used in emails."],

	// Subscriber Data Views
	["_subscribers", "The master list of subscribers."],
	["_enterpriseattribute", "Profile and preference attributes for the Enterprise."],
	["_listsubscribers", "The relationship between subscribers and specific lists."],

	// Journey Builder Data Views
	["_journey", "Metadata for all journeys."],
	["_journeyactivity", "Information on specific activities within journeys."],

	// Automation Studio Data Views
	["_automationinstance", "History and status of automation runs."],
	["_automationactivityinstance", "Details on individual automation activity steps."],

	// Mobile Connect (SMS) Data Views
	["_smsmessagetracking", "Tracking data for SMS sends."],
	["_smssubscriptionlog", "History of SMS opt-ins/opt-outs."],
	["_undeliverablesms", "Records of failed SMS deliveries."],
	["_mobileaddress", "Mobile contact details."],
	["_mobilesubscription", "SMS subscription status."],
	["_chatmessagingsubscription", "Subscription data for chat channels."],

	// Mobile Push Data Views
	["_pushaddress", "Device and contact associations for push notifications."],
	["_pushtag", "Tags associated with push notification devices."],

	// Group Connect Data Views
	["_mobilelineaddresscontactsubscriptionview", "Subscription views for Group Connect."],
	["_mobilelineorphancontactview", "Data on orphan contacts in Group Connect."]
]);

/**
 * Extracts the BU prefix ("retrieve/cred/bu") and credential prefix
 * ("retrieve/cred") from a file URI path.
 *
 * @param filePath - POSIX-style file path from VSCode.Uri.path
 * @returns buPrefix, credPrefix, and credBu, or undefined when the path
 *          does not match the expected retrieve/<cred>/<bu>/query/ structure.
 */
function extractPathInfo(filePath: string): { buPrefix: string; credPrefix: string; credBu: string } | undefined {
	const match = filePath.match(/\/(retrieve\/([^/]+\/[^/]+))\/[^/]+\//);
	if (!match) return undefined;
	return {
		buPrefix: match[1], // "retrieve/cred/bu"
		credPrefix: `retrieve/${match[2].split("/")[0]}`, // "retrieve/cred"
		credBu: match[2] // "cred/bu"
	};
}

/**
 * Diagnostic provider for SQL query files inside the retrieve/ folder tree.
 *
 * Scans FROM / JOIN clauses for table name references and classifies each:
 *   • Known SFMC data view (e.g. _Sent, _Open) → ignored here; hover text
 *     is provided by {@link SqlDataViewHoverProvider}.
 *   • Data extension found in the BU's dataExtension folder → no diagnostic.
 *   • Unresolvable name → Warning diagnostic whose code carries the cred/bu
 *     and name so that {@link SqlCodeActionProvider} can offer a "Retrieve"
 *     quick fix.
 *
 * Name resolution mirrors {@link DataExtensionLinkProvider}: a per-BU cache
 * of lowercased "Name" fields is lazily built from
 * retrieve/<cred>/<bu>/dataExtension/*.dataExtension-meta.json files.
 * ENT.-prefixed names are resolved against the _ParentBU_ folder.
 *
 * @class SqlDiagnosticProvider
 */
class SqlDiagnosticProvider {
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
			`${DIAGNOSTIC_SOURCE}.sqlDataExtension`
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
			files.map(async uri => {
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
	 * Validates all dataExtension / data-view references in a SQL document
	 * and updates the diagnostic collection.
	 *
	 * @param document - The document to validate
	 * @returns Promise that resolves once diagnostics have been updated
	 */
	async validateDocument(document: VSCode.TextDocument): Promise<void> {
		const filePath = document.uri.path;

		// Only process .sql files inside retrieve/<cred>/<bu>/query/
		if (!filePath.endsWith(".sql") || !SUPPORTED_SQL_FILE_REGEX.test(filePath)) {
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
		const regex = new RegExp(SQL_DE_REGEX.source, "gi");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const hasEntPrefix = match[1] !== undefined;
			// Group 2: bracketed name; Group 3: bare identifier
			const name = match[2] ?? match[3];
			if (!name) continue;

			const lowerName = name.toLowerCase();

			// The clickable range starts right after the FROM / JOIN keyword
			const fromJoinLen = match[0].match(SQL_FROM_JOIN_PREFIX_REGEX)?.[0].length ?? 0;
			const linkStart = match.index + fromJoinLen;
			const linkEnd = match.index + match[0].length;
			const range = new VSCode.Range(document.positionAt(linkStart), document.positionAt(linkEnd));

			// ── Known SFMC data view → handled by hover provider ──
			const dataViewDescription = DATA_VIEWS.get(lowerName);
			if (dataViewDescription) {
				continue;
			}

			// ── Resolve against the DE name cache ──
			const cache = hasEntPrefix ? parentCache : buCache;
			if (cache.has(lowerName)) continue;

			// Also check the other cache in case the DE is shared
			const otherCache = hasEntPrefix ? buCache : parentCache;
			if (otherCache.has(lowerName)) continue;

			// ── Not found → Warning with quickfix metadata ──
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
				value: DIAGNOSTIC_CODE_SQL,
				target: VSCode.Uri.parse(
					`vscode://settings/${DIAGNOSTIC_SOURCE}.${DIAGNOSTIC_CODE_SQL}?credBu=${encodeURIComponent(retrieveCredBu)}&name=${encodeURIComponent(name)}`
				)
			};
			diagnostics.push(diagnostic);
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}
}

export { DIAGNOSTIC_CODE_SQL };
export { DATA_VIEWS };
export default SqlDiagnosticProvider;
