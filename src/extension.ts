import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";

let extensionInstance: DevToolsExtension | undefined;

export async function activate(context: VSCode.ExtensionContext): Promise<void> {
	extensionInstance = new DevToolsExtension(context);
	extensionInstance.init();
}

export function deactivate(): void {
	extensionInstance = undefined;
}
