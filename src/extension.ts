import { ExtensionContext } from 'vscode';
import { init } from './devtools/init';

export function activate(context: ExtensionContext) {
	init(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
