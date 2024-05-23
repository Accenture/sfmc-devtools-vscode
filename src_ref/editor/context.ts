import { IEditor } from "@types";

class VSCodeContext {
	private context: IEditor.IExtensionContext;
	constructor(context: IEditor.IExtensionContext) {
		this.context = context;
	}

	getContext() {
		return this.context;
	}
}

export default VSCodeContext;
