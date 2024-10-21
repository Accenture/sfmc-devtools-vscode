import { VSCode } from "./vscode";

type ProgressWindowLocal = "SourceControl" | "Window" | "Notification";
type StatusBarFields = "text" | "color" | "backgroundColor";
type ProgressBar = VSCode.Progress<{ message?: string; increment?: number }>;
type ProgressBarCancellation = VSCode.CancellationToken;
type ProgressBarHandler = (progressBar: ProgressBar, CancellationToken: ProgressBarCancellation) => Thenable<unknown>;
interface IExtensionContext extends VSCode.ExtensionContext {}
interface IWorkspace {
	isFileInFolder: (file: string) => Promise<boolean>;
	getSubFolders: () => Promise<string[]>;
}
interface IInstance {
	workspace: IWorkspace;
}

export {
	ProgressBar,
	ProgressBarCancellation,
	ProgressBarHandler,
	ProgressWindowLocal,
	StatusBarFields,
	IExtensionContext,
	IInstance,
	IWorkspace
};