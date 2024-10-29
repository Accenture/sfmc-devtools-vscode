import { TEditor } from "@types";

class VSCodeEditor {
	private vscodeContext: TEditor.VSCodeContext;
	private vscodeWorkspace: TEditor.VSCodeWorkspace;
	private vscodeWindow: TEditor.VSCodeWindow;
	private vscodeCommands: TEditor.VSCodeCommands;
	private vscodeExtensions: TEditor.VSCodeExtensions;
	constructor(context: TEditor.IExtensionContext) {
		this.vscodeContext = new TEditor.VSCodeContext(context);
		this.vscodeWorkspace = new TEditor.VSCodeWorkspace();
		this.vscodeWindow = new TEditor.VSCodeWindow();
		this.vscodeCommands = new TEditor.VSCodeCommands();
		this.vscodeExtensions = new TEditor.VSCodeExtensions();
	}

	getContext() {
		return this.vscodeContext;
	}

	getWorkspace() {
		return this.vscodeWorkspace;
	}

	getWindow() {
		return this.vscodeWindow;
	}

	getCommands() {
		return this.vscodeCommands;
	}

	getExtensions() {
		return this.vscodeExtensions;
	}
}

export default VSCodeEditor;
