import { VSCode } from "@types";
import DevToolsExtension from "./devtools/index";

export async function activate(context: VSCode.ExtensionContext) {
	try {
		// initialize DevTools Extension
		new DevToolsExtension(context).init();
	} catch (error) {
		// log error
	}
}

export function deactivate() {}
