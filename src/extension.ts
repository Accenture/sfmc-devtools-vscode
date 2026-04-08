import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";
import { checkAndShowWhatsNew, showWhatsNewPanel } from "./whatsNew";

let extensionInstance: DevToolsExtension | undefined;

const EXTENSION_DISPLAY_NAME = "SFMC DevTools";

export async function activate(context: VSCode.ExtensionContext): Promise<void> {
	context.subscriptions.push(
		VSCode.commands.registerCommand("sfmc-devtools-vscode.showWhatsNew", () =>
			showWhatsNewPanel(context, EXTENSION_DISPLAY_NAME)
		)
	);
	void checkAndShowWhatsNew(context, EXTENSION_DISPLAY_NAME);

	extensionInstance = new DevToolsExtension(context);
	extensionInstance.init();
}

export function deactivate(): void {
	extensionInstance = undefined;
}
