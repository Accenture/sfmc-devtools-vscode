/* eslint-disable @typescript-eslint/no-unused-vars */
import { IEditor } from "@types";
import VSCodeContext from "./context";
import VSCodeWorkspace from "./workspace";
import VSCodeWindow from "./window";

class VSCodeEditor {
	vscodeContext: VSCodeContext;
	vscodeWorkspace: VSCodeWorkspace;
	vscodeWindow: VSCodeWindow;
	constructor(context: IEditor.IExtensionContext) {
		this.vscodeContext = new VSCodeContext(context);
		this.vscodeWorkspace = new VSCodeWorkspace();
		this.vscodeWindow = new VSCodeWindow();
	}

	getWorkspace() {
		return this.vscodeWorkspace;
	}

	getWindow() {
		return this.vscodeWindow;
	}
}

export default VSCodeEditor;
