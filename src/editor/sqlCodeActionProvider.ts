import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";
import { DIAGNOSTIC_CODE_SQL } from "./sqlDiagnosticProvider";

/**
 * VS Code command ID for the "Retrieve dataExtension" quick fix.
 * Registered in activateLinkProviders() and handled by DevToolsExtension.
 */
const RETRIEVE_SQL_DE_COMMAND = "sfmc-devtools-vscode.retrieveSqlDataExtension";

/**
 * Arguments passed to the {@link RETRIEVE_SQL_DE_COMMAND} command.
 */
interface IRetrieveSqlDataExtensionArgs {
	/** Workspace root path (no trailing slash, POSIX-style from VSCode.Uri.path). */
	projectPath: string;
	/** "cred/bu" portion extracted from the file path (e.g. "myOrg/myBU"). */
	credBu: string;
	/** Data-extension name referenced in the SQL FROM / JOIN clause. */
	name: string;
	/** String form of the document URI that triggered the quick fix. */
	documentUri: string;
}

/**
 * Code-action provider that offers a "Retrieve dataExtension:name from cred/bu"
 * quick fix for every unresolvable SQL data-extension diagnostic emitted by
 * {@link SqlDiagnosticProvider}.
 *
 * When the user accepts the quick fix the extension runs:
 *   mcdev retrieve cred/bu -m dataExtension:"name"
 * which fetches the missing data extension so that it becomes available
 * locally and the diagnostic disappears on the next validation.
 *
 * @class SqlCodeActionProvider
 * @implements {VSCode.CodeActionProvider}
 */
class SqlCodeActionProvider implements VSCode.CodeActionProvider {
	/**
	 * Returns a quick-fix code action for each unresolved SQL data-extension
	 * diagnostic that overlaps the given range.
	 *
	 * @param document  - The document in which actions are requested
	 * @param _range    - The highlighted range or cursor position (unused)
	 * @param context   - Contains the diagnostics that overlap the range
	 * @returns Array of applicable code actions (may be empty)
	 */
	provideCodeActions(
		document: VSCode.TextDocument,
		_range: VSCode.Range | VSCode.Selection,
		context: VSCode.CodeActionContext
	): VSCode.CodeAction[] {
		const actions: VSCode.CodeAction[] = [];

		const filePath = document.uri.path;
		const retrieveIdx = filePath.indexOf("/retrieve/");
		if (retrieveIdx < 0) return actions;
		const projectPath = filePath.substring(0, retrieveIdx);

		for (const diagnostic of context.diagnostics) {
			if (diagnostic.source !== DIAGNOSTIC_SOURCE) continue;
			if (typeof diagnostic.code !== "object" || diagnostic.code.value !== DIAGNOSTIC_CODE_SQL) continue;

			const queryString = diagnostic.code.target.query;
			const params = new URLSearchParams(queryString);
			const credBu = params.get("credBu") ?? "";
			const name = params.get("name") ?? "";
			if (!credBu || !name) continue;

			const title = `Retrieve dataExtension:${name} from ${credBu}`;
			const action = new VSCode.CodeAction(title, VSCode.CodeActionKind.QuickFix);
			action.diagnostics = [diagnostic];
			action.isPreferred = true;
			const args: IRetrieveSqlDataExtensionArgs = {
				projectPath,
				credBu,
				name,
				documentUri: document.uri.toString()
			};
			action.command = {
				title,
				command: RETRIEVE_SQL_DE_COMMAND,
				arguments: [args]
			};
			actions.push(action);
		}

		return actions;
	}
}

export { RETRIEVE_SQL_DE_COMMAND };
export type { IRetrieveSqlDataExtensionArgs };
export default SqlCodeActionProvider;
