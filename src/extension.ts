import { ExtensionContext } from 'vscode';
import { editorContext } from './editor/context';
import { devtoolsMain } from './devtools/main';
import { log } from './editor/output';

export async function activate(context: ExtensionContext) {
	log("info", "Activating extension...");
	log("debug", "Setting context...");
	editorContext.set(context);
	devtoolsMain.initDevToolsExtension();
}

// this method is called when your extension is deactivated
export function deactivate() {}
