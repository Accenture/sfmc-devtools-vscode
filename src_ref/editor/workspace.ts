import { VSCode } from "@types";

class VSCodeWorkspace {
	private workspace: typeof VSCode.workspace = VSCode.workspace;

	getWorkspaceConfiguration(section: string): VSCode.WorkspaceConfiguration {
		return this.workspace.getConfiguration(section);
	}

	isConfigurationKeyEnabled(section: string, key: string): boolean {
		const workpaceConfiguration: VSCode.WorkspaceConfiguration = this.getWorkspaceConfiguration(section);
		return Boolean(workpaceConfiguration.get(key, true)) === true;
	}

	setConfigurationKey(section: string, key: string, value: string | boolean) {
		const workpaceConfiguration: VSCode.WorkspaceConfiguration = this.getWorkspaceConfiguration(section);
		workpaceConfiguration.update(key, value, VSCode.ConfigurationTarget.Global);
	}

	getWorkspaceURI(): VSCode.Uri | undefined {
		console.log("=== VSCodeWorkspace: Get URI ===");
		const workspaceFolders: readonly VSCode.WorkspaceFolder[] | undefined = this.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length) return workspaceFolders[0].uri;
		// throw Error
		return;
	}

	getWorkspacePath(): string | undefined {
		const workspaceURI: VSCode.Uri | undefined = this.getWorkspaceURI();
		if (workspaceURI) return workspaceURI.path;
		// throw Error
		return;
	}

	getWorkspaceFsPath(): string | undefined {
		const workspaceURI: VSCode.Uri | undefined = this.getWorkspaceURI();
		if (workspaceURI) return workspaceURI.fsPath;
		// throw Error
		return;
	}

	async getWokspaceFiles(uri: VSCode.Uri): Promise<[string, VSCode.FileType][]> {
		console.log("=== VSCodeWorkspace: Get Workspace Files ===");
		const folderFiles: [string, VSCode.FileType][] = await this.workspace.fs.readDirectory(uri);
		return folderFiles;
	}

	async getWorkspaceSubFolders(): Promise<string[]> {
		console.log("=== VSCodeWorkspace: Get SubFolders ===");
		const uri: VSCode.Uri | undefined = this.getWorkspaceURI();
		if (uri) {
			const folderFiles: [string, VSCode.FileType][] = await this.getWokspaceFiles(uri);
			return (
				folderFiles
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					.filter(([_, type]: [string, VSCode.FileType]) => type === VSCode.FileType.Directory)
					.map(([name]: [string, VSCode.FileType]) => name)
			);
		}
		// throw Error
		return [];
	}

	async findWorkspaceFiles(file: string): Promise<string[]> {
		console.log("=== VSCodeWorkspace: findWorkspaceFiles ===");
		const workspaceFiles: VSCode.Uri[] = await this.workspace.findFiles(file);
		return workspaceFiles.map((file: VSCode.Uri) => file.fsPath);
	}

	async isFileInWorkspaceFolder(file: string): Promise<boolean> {
		console.log("=== VSCodeWorkspace: IsFileInFolder ===");
		const workspaceFiles: string[] = await this.findWorkspaceFiles(file);
		return workspaceFiles.length > 0;
	}
}

export default VSCodeWorkspace;
