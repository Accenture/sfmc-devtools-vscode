import {
	workspace,
	Uri,
	TextDocument,
	WorkspaceFolder,
	FileType,
	FileStat,
	WorkspaceConfiguration,
	ConfigurationTarget
} from "vscode";
import { editorCommands } from "./commands";

type WorkspaceConfigurationTarget = "Global" | "Workspace" | "WorkspaceFolder";

function getWorkspaceURI(): Uri {
	const wsFolder: readonly WorkspaceFolder[] | undefined = workspace.workspaceFolders;
	if (wsFolder) {
		const [{ uri }] = wsFolder;
		return uri;
	} else {
		throw new Error("Could not get Workspace Folder.");
	}
}
function getWorkspaceURIPath(): string {
	const wsURI: Uri = getWorkspaceURI();
	if (wsURI && "path" in wsURI) {
		return wsURI.path;
	}
	throw new Error("Failed to find Worspace Uri PATH.");
}

async function getWorkspaceSubFolders(): Promise<string[]> {
	const wsURI: Uri = getWorkspaceURI();
	const subFolders = await workspace.fs.readDirectory(wsURI);
	return subFolders.map(([folderName]: [string, FileType]) => folderName);
}

async function isFileInFolder(filename: string): Promise<boolean> {
	const fileArray: Uri[] = await workspace.findFiles(filename);
	return fileArray.length > 0;
}

async function readFile(path: string): Promise<string> {
	const document: TextDocument = await workspace.openTextDocument(path);
	return document.getText();
}

function reloadWorkspace() {
	editorCommands.executeCommand("workbench.action.reloadWindow", []);
}

function getFilesURIPath(files: Uri | Uri[]) {
	return [files].flat().map((file: Uri) => file.path);
}

async function isFile(file: string | Uri) {
	if (typeof file === "string") {
		file = Uri.file(file);
	}
	const { type }: FileStat = await workspace.fs.stat(file);
	const fileType: string = FileType[type];
	return fileType.toLowerCase() === "file";
}

function handleWorkspaceConfiguration(section: string, target: WorkspaceConfigurationTarget) {
	const workspaceConfiguration: WorkspaceConfiguration = workspace.getConfiguration(section);
	if (workspaceConfiguration) {
		return {
			get: (key: string, value: string | boolean) => workspaceConfiguration.get(key, value),
			set: (key: string, value: string | boolean) =>
				workspaceConfiguration.update(key, value, ConfigurationTarget[target])
		};
	}
	throw new Error("Failed to handle Workspace Configuration.");
}

function getFileSystemPaths(paths: string | string[]) {
	return [paths].flat().map((path: string) => Uri.file(path).fsPath);
}

export const editorWorkspace = {
	isFileInFolder,
	readFile,
	reloadWorkspace,
	getWorkspaceURIPath,
	getWorkspaceSubFolders,
	handleWorkspaceConfiguration,
	getFilesURIPath,
	isFile,
	getFileSystemPaths
};
