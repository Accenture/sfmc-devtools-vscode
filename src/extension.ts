import { ExtensionContext, commands } from 'vscode';
import { init } from './init';

export function activate(context: ExtensionContext) {
	let disposable = commands.registerCommand('sfmc-devtools-vscext.initializeDevTools', () => init(context));
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
