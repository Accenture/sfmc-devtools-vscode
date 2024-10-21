import * as vscode from "vscode";
import DevToolsExtension from "./devtools/index";

export async function activate(context: vscode.ExtensionContext) {
	try {
		// initialize DevTools Extension
		new DevToolsExtension(context).init();
	} catch (error) {
		// log error
	}
}

export function deactivate() {}