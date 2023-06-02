import { ExtensionContext } from 'vscode';
import { editorContext } from './editor/context';
import { init } from './devtools/init';

export function activate(context: ExtensionContext) {
	editorContext.set(context);
	init();
}

// this method is called when your extension is deactivated
export function deactivate() {}
