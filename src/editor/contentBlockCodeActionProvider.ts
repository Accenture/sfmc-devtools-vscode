import { VSCode } from "@types";
import { DIAGNOSTIC_SOURCE } from "./relatedItemDiagnosticProvider";
import { DIAGNOSTIC_CODE } from "./contentBlockDiagnosticProvider";

/**
 * VS Code command ID for the "Retrieve content block" quick fix.
 * Registered in activateLinkProviders() and handled by DevToolsExtension.
 */
const RETRIEVE_CONTENT_BLOCK_COMMAND = "sfmc-devtools-vscode.retrieveContentBlock";

/**
 * Arguments passed to the {@link RETRIEVE_CONTENT_BLOCK_COMMAND} command.
 */
interface IRetrieveContentBlockArgs {
	/** Workspace root path (no trailing slash, POSIX-style from VSCode.Uri.path). */
	projectPath: string;
	/** "cred/bu" portion extracted from the file path (e.g. "myOrg/myBU"). */
	credBu: string;
	/** Content-block key referenced by ContentBlockByKey(). */
	key: string;
	/** String form of the document URI that triggered the quick fix. */
	documentUri: string;
}

/**
 * Code-action provider that offers a "Retrieve asset:key from cred/bu" quick
 * fix for every unresolvable-ContentBlockByKey diagnostic emitted by
 * {@link ContentBlockDiagnosticProvider}.
 *
 * When the user accepts the quick fix the extension runs:
 *   mcdev retrieve cred/bu -m asset:"key"
 * which fetches the missing content block so that it becomes available
 * locally and the diagnostic disappears on the next save.
 *
 * @class ContentBlockCodeActionProvider
 * @implements {VSCode.CodeActionProvider}
 */
class ContentBlockCodeActionProvider implements VSCode.CodeActionProvider {
	/**
	 * Returns a quick-fix code action for each unresolved ContentBlockByKey
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
		const deployIdx = filePath.indexOf("/deploy/");
		const splitIdx = retrieveIdx >= 0 ? retrieveIdx : deployIdx;
		if (splitIdx < 0) return actions;
		const projectPath = filePath.substring(0, splitIdx);

		for (const diagnostic of context.diagnostics) {
			if (diagnostic.source !== DIAGNOSTIC_SOURCE) continue;
			if (typeof diagnostic.code !== "object" || diagnostic.code.value !== DIAGNOSTIC_CODE) continue;

			const queryString = diagnostic.code.target.query;
			const params = new URLSearchParams(queryString);
			const credBu = params.get("credBu") ?? "";
			const key = params.get("key") ?? "";
			if (!credBu || !key) continue;

			const title = `Retrieve asset:${key} from ${credBu}`;
			const action = new VSCode.CodeAction(title, VSCode.CodeActionKind.QuickFix);
			action.diagnostics = [diagnostic];
			action.isPreferred = true;
			const args: IRetrieveContentBlockArgs = {
				projectPath,
				credBu,
				key,
				documentUri: document.uri.toString()
			};
			action.command = {
				title,
				command: RETRIEVE_CONTENT_BLOCK_COMMAND,
				arguments: [args]
			};
			actions.push(action);
		}

		return actions;
	}
}

export { RETRIEVE_CONTENT_BLOCK_COMMAND };
export type { IRetrieveContentBlockArgs };
export default ContentBlockCodeActionProvider;
