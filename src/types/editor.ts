import { VSCode } from "./vscode";
import VSCodeCommands from "../editor/commands";
import VSCodeContext from "../editor/context";
import VSCodeExtensions from "../editor/extensions";
import VSCodeEditor from "../editor/index";
import VSCodeWindow from "../editor/window";
import VSCodeWorkspace from "../editor/workspace";

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
interface IBuildCredentialConfiguration {
	fromCrendentialName: string;
	fromParentBusinessUnit: string;
	fromMarket: string;
	toCredentialName: string;
	toParentBusinessUnit: string;
	toMarket: string;
	dependencies: boolean;
}

interface IBuildCommandConfiguration {
	[projectName: string]: {
		filesPaths: string[];
		buildCredentialConfig: IBuildCredentialConfiguration;
	};
}

export {
	ProgressBar,
	ProgressBarCancellation,
	ProgressBarHandler,
	ProgressWindowLocal,
	StatusBarFields,
	IBuildCommandConfiguration,
	IExtensionContext,
	IInstance,
	IWorkspace,
	VSCodeCommands,
	VSCodeContext,
	VSCodeEditor,
	VSCodeExtensions,
	VSCodeWindow,
	VSCodeWorkspace
};
