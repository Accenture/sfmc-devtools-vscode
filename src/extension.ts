import { editorContext, ExtensionContext } from './editor/context';
import { devtoolsMain } from './devtools/main';
export async function activate(context: ExtensionContext) {
	editorContext.set(context);
	devtoolsMain.initDevToolsExtension();
}

// this method is called when your extension is deactivated
export function deactivate() {}
