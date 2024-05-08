import { workspace, Uri, WorkspaceFolder, FileType, WorkspaceConfiguration, ConfigurationTarget } from "vscode";

class VSCodeWorkspace {
	getWorkspaceConfiguration(section: string): WorkspaceConfiguration {
		return workspace.getConfiguration(section);
	}

	isConfigurationKeyEnabled(section: string, key: string): boolean {
		const workpaceConfiguration: WorkspaceConfiguration = this.getWorkspaceConfiguration(section);
		return Boolean(workpaceConfiguration.get(key, true)) === true;
	}

	setConfigurationKey(section: string, key: string, value: string | boolean) {
		const workpaceConfiguration: WorkspaceConfiguration = this.getWorkspaceConfiguration(section);
		workpaceConfiguration.update(key, value, ConfigurationTarget.Global);
	}

	getURI(): Uri | undefined {
		console.log("=== VSCodeWorkspace: Get URI ===");
		const workspaceFolders: readonly WorkspaceFolder[] | undefined = workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length) return workspaceFolders[0].uri;
		// throw Error
		return;
	}

	async getWokspaceFiles(uri: Uri): Promise<[string, FileType][]> {
		console.log("=== VSCodeWorkspace: Get Workspace Files ===");
		const folderFiles: [string, FileType][] = await workspace.fs.readDirectory(uri);
		return folderFiles;
	}

	async getSubFolders(): Promise<string[]> {
		console.log("=== VSCodeWorkspace: Get SubFolders ===");
		const uri: Uri | undefined = this.getURI();
		if (uri) {
			const folderFiles: [string, FileType][] = await this.getWokspaceFiles(uri);
			return folderFiles
				.filter(([name, type]: [string, FileType]) => type === FileType.Directory)
				.map(([name]: [string, FileType]) => name);
		}
		// throw Error
		return [];
	}

	async isFileInFolder(file: string): Promise<boolean> {
		console.log("=== VSCodeWorkspace: IsFileInFolder ===");
		const workspaceFile: Uri[] = await workspace.findFiles(file);
		return workspaceFile.length > 0;
	}
}

export default VSCodeWorkspace;
