import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";

export async function activate(context: VSCode.ExtensionContext) {
	new DevToolsExtension(context).init();
}

export function deactivate() {}
