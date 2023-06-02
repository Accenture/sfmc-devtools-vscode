import { ExtensionContext } from 'vscode';
import { editorContext } from './editor/context';
import { devtoolsInit } from './devtools/init';
import { log } from './editor/output';

export function activate(context: ExtensionContext) {
	log("info", "Activating extension...");
	log("debug", "Setting context...");
	editorContext.set(context);
	devtoolsInit.run();
}

// this method is called when your extension is deactivated
export function deactivate() {}
