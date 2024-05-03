import { IEditor } from "@types";

class VSCodeContext {
	context: IEditor.IExtensionContext;
	constructor(context: IEditor.IExtensionContext) {
		this.context = context;
	}

	getContext() {
		return this.context;
	}
}

export default VSCodeContext;
