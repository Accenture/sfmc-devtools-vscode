/* eslint-disable @typescript-eslint/no-unused-vars */
import { IEditor } from "@types";
import VSCodeContext from "./context";
import VSCodeWorkspace from "./workspace";

class VSCodeEditor {
	vscodeContext: VSCodeContext;
	vscodeWorkspace: VSCodeWorkspace;
	constructor(context: IEditor.IExtensionContext) {
		this.vscodeContext = new VSCodeContext(context);
		this.vscodeWorkspace = new VSCodeWorkspace();
	}

	getWorkspace() {
		return this.vscodeWorkspace;
	}
}

export default VSCodeEditor;
