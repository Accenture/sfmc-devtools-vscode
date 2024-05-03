import * as vscode from "vscode";
import DevTools from "./devtools/index";

export async function activate(context: vscode.ExtensionContext) {
	try {
		// initialize DevTools Extension
		new DevTools(context).init();
	} catch (error) {
		// log error
	}
}

export function deactivate() {}
