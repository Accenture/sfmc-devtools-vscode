import { TEditor } from "@types";

class VSCodeContext {
	private context: TEditor.IExtensionContext;
	constructor(context: TEditor.IExtensionContext) {
		this.context = context;
	}

	getExtensionName(): string {
		return this.context.extension.packageJSON.name;
	}

	getExtensionVersion(): string {
		return this.context.extension.packageJSON.version;
	}
}

export default VSCodeContext;
