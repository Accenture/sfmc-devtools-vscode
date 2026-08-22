import { VSCode } from "@types";
import DevToolsExtension, { type DevToolsTelemetryOptions } from "./devtools/index";
import { ExtensionLifecycleCoordinator } from "./extensionLifecycle";
import { checkAndShowWhatsNew, showWhatsNewPanel } from "./whatsNew";

const lifecycle = new ExtensionLifecycleCoordinator();
const EXTENSION_DISPLAY_NAME = "SFMC DevTools";

export async function activate(
	context: VSCode.ExtensionContext,
	telemetryOptions?: DevToolsTelemetryOptions
): Promise<void> {
	context.subscriptions.push(
		VSCode.commands.registerCommand("sfmc-devtools-vscode.showWhatsNew", () =>
			showWhatsNewPanel(context, EXTENSION_DISPLAY_NAME)
		)
	);
	void checkAndShowWhatsNew(context, EXTENSION_DISPLAY_NAME);
	await lifecycle.activate(new DevToolsExtension(context, telemetryOptions));
}

export async function deactivate(): Promise<void> {
	await lifecycle.deactivate();
}
