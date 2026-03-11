import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";

/**
 * Activates the VScode extension
 *
 * @export
 * @async
 * @param {VSCode.ExtensionContext} context - extension context
 * @returns {Promise<void>}
 */
export async function activate(context: VSCode.ExtensionContext): Promise<void> {
	new DevToolsExtension(context).init();
}

/**
 * Deactivates the VScode extension
 *
 * @export
 */
export function deactivate() {}
