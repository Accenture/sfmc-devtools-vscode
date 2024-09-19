import { ExtensionContext } from "vscode";

type StatusBarFields = "text" | "color" | "backgroundColor";

interface IExtensionContext extends ExtensionContext {}
interface IWorkspace {
	isFileInFolder: (file: string) => Promise<boolean>;
	getSubFolders: () => Promise<string[]>;
}
interface IInstance {
	workspace: IWorkspace;
}

export { StatusBarFields, IExtensionContext, IInstance, IWorkspace };
