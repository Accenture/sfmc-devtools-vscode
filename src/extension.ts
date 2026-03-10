import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";

let devToolsExtension: DevToolsExtension | undefined;

/**
 * Activates the VScode extension
 *
 * @export
 * @async
 * @param {VSCode.ExtensionContext} context - extension context
 * @returns {Promise<void>}
 */
export async function activate(context: VSCode.ExtensionContext): Promise<void> {
	devToolsExtension = new DevToolsExtension(context);
	await devToolsExtension.init();
}

/**
 * Deactivates the VScode extension
 *
 * @export
 * @returns {void}
 */
export function deactivate(): void {
	if (devToolsExtension) devToolsExtension.close();
}
