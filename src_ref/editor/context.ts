import { IEditor } from "@types";

let extensionContext: IEditor.IExtensionContext | null = null;
export default function (context: IEditor.IExtensionContext) {
	extensionContext = context;
	return {
		get: () => extensionContext
	};
}
