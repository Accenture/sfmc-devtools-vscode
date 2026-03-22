import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";

/**
 * VS Code command ID for the "Retrieve related item" quick fix.
 * Registered in activateLinkProviders() and handled by DevToolsExtension.
 */
const RETRIEVE_RELATED_ITEM_COMMAND = "sfmc-devtools-vscode.retrieveRelatedItem";

/**
 * Arguments passed to the {@link RETRIEVE_RELATED_ITEM_COMMAND} command.
 */
interface IRetrieveRelatedItemArgs {
	/** Workspace root path (no trailing slash, POSIX-style from VSCode.Uri.path). */
	projectPath: string;
	/** "cred/bu" portion extracted from the retrieve path (e.g. "myOrg/myBU"). */
	credBu: string;
	/** Metadata type folder name (e.g. "dataExtension", "query"). */
	type: string;
	/** Item key (e.g. "myKey1"). */
	key: string;
}

/**
 * Code-action provider that offers a "Retrieve type:key from cred/bu" quick fix
 * for every unresolvable-reference diagnostic emitted by
 * {@link RelatedItemDiagnosticProvider}.
 *
 * When the user accepts the quick fix the extension runs:
 *   mcdev retrieve cred/bu -m type:"key"
 * which fetches the missing item from the SFMC BU so that it becomes available
 * locally and the diagnostic disappears on the next save.
 *
 * @class RelatedItemCodeActionProvider
 * @implements {VSCode.CodeActionProvider}
 */
class RelatedItemCodeActionProvider implements VSCode.CodeActionProvider {
	/**
	 * Returns a quick-fix code action for each unresolved-reference diagnostic
	 * that overlaps the given range.
	 *
	 * @param document  - The document in which actions are requested
	 * @param _range    - The highlighted range or cursor position (unused; the
	 *                    diagnostics in context already carry exact ranges)
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
			if (typeof diagnostic.code !== "string") continue;

			let info: { credBu: string; type: string; key: string };
			try {
				info = JSON.parse(diagnostic.code);
			} catch {
				continue;
			}

			const { credBu, type, key } = info;
			const title = `Retrieve ${type}:${key} from ${credBu}`;

			const action = new VSCode.CodeAction(title, VSCode.CodeActionKind.QuickFix);
			action.diagnostics = [diagnostic];
			action.isPreferred = true;
			const args: IRetrieveRelatedItemArgs = { projectPath, credBu, type, key };
			action.command = {
				title,
				command: RETRIEVE_RELATED_ITEM_COMMAND,
				arguments: [args]
			};
			actions.push(action);
		}

		return actions;
	}
}

export { RETRIEVE_RELATED_ITEM_COMMAND };
export type { IRetrieveRelatedItemArgs };
export default RelatedItemCodeActionProvider;
