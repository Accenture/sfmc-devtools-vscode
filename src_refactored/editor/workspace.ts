import * as vscode from "vscode";
import { IEditor } from "../types";

export default function (): IEditor.IWorkspace {
	function getURI(): vscode.Uri | undefined {
		const workspace: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
		if (workspace && workspace.length) return workspace[0].uri;
		// throw Error
		return;
	}

	async function getWokspaceFiles(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		const folderFiles: [string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(uri);
		return folderFiles;
	}

	async function getSubFolders(): Promise<string[]> {
		const uri: vscode.Uri | undefined = getURI();
		if (uri) {
			const folderFiles: [string, vscode.FileType][] = await getWokspaceFiles(uri);
			return folderFiles
				.filter(([name, type]: [string, vscode.FileType]) => type === vscode.FileType.Directory)
				.map(([name]: [string, vscode.FileType]) => name);
		}
		// throw Error
		return [];
	}

	async function isFileInFolder(file: string): Promise<boolean> {
		const workspaceFile: vscode.Uri[] = await vscode.workspace.findFiles(file);
		return workspaceFile.length > 0;
	}

	return { isFileInFolder, getSubFolders };
}
