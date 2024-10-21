import { TEditor } from "@types";

class VSCodeContext {
	private context: TEditor.IExtensionContext;
	constructor(context: TEditor.IExtensionContext) {
		this.context = context;
	}

	getContext() {
		return this.context;
	}
}

export default VSCodeContext;
