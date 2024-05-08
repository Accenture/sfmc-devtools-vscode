import VSCodeContext from "./context";
import VSCodeWorkspace from "./workspace";
import VSCodeWindow from "./window";
import VSCodeCommands from "./commands";
import VSCodeExtensions from "./extensions";
import { IEditor } from "@types";

class VSCodeEditor {
	vscodeContext: VSCodeContext;
	vscodeWorkspace: VSCodeWorkspace;
	vscodeWindow: VSCodeWindow;
	vscodeCommands: VSCodeCommands;
	vscodeExtensions: VSCodeExtensions;
	constructor(context: IEditor.IExtensionContext) {
		this.vscodeContext = new VSCodeContext(context);
		this.vscodeWorkspace = new VSCodeWorkspace();
		this.vscodeWindow = new VSCodeWindow();
		this.vscodeCommands = new VSCodeCommands();
		this.vscodeExtensions = new VSCodeExtensions();
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
