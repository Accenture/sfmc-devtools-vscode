import * as vscode from "vscode";

class VSCodeWorkspace {
	getURI(): vscode.Uri | undefined {
		console.log("=== VSCodeWorkspace: Get URI ===");
		const workspace: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
		if (workspace && workspace.length) return workspace[0].uri;
		// throw Error
		return;
	}

	async getWokspaceFiles(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		console.log("=== VSCodeWorkspace: Get Workspace Files ===");
		const folderFiles: [string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(uri);
		return folderFiles;
	}

	async getSubFolders(): Promise<string[]> {
		console.log("=== VSCodeWorkspace: Get SubFolders ===");
		const uri: vscode.Uri | undefined = this.getURI();
		if (uri) {
			const folderFiles: [string, vscode.FileType][] = await this.getWokspaceFiles(uri);
			return folderFiles
				.filter(([name, type]: [string, vscode.FileType]) => type === vscode.FileType.Directory)
				.map(([name]: [string, vscode.FileType]) => name);
		}
		// throw Error
		return [];
	}

	async isFileInFolder(file: string): Promise<boolean> {
		console.log("=== VSCodeWorkspace: IsFileInFolder ===");
		const workspaceFile: vscode.Uri[] = await vscode.workspace.findFiles(file);
		return workspaceFile.length > 0;
	}
}

export default VSCodeWorkspace;
