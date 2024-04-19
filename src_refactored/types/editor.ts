import { ExtensionContext } from "vscode";

interface IExtensionContext extends ExtensionContext {}
interface IWorkspace {
	isFileInFolder: (file: string) => Promise<boolean>;
	getSubFolders: () => Promise<string[]>;
}
interface IInstance {
	workspace: IWorkspace;
}

export { IExtensionContext, IInstance, IWorkspace };
