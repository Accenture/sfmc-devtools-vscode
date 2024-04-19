import * as vscode from "vscode";
import DevTools from "./devtools";
export async function activate(context: vscode.ExtensionContext) {
	try {
		// initialize DevTools Extension
		DevTools().init(context);
	} catch (error) {
		// log error
	}
}

export function deactivate() {}
