/* eslint-disable @typescript-eslint/no-unused-vars */
import { IEditor } from "../types";
import ExtensionContext from "./context";
import ExtensionWorkspace from "./workspace";

export default function (context: IEditor.IExtensionContext): IEditor.IInstance {
	const extensionContext = ExtensionContext(context);
	const workspace = ExtensionWorkspace();
	return { workspace };
}
