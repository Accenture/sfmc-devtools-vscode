import { VSCode } from "@types";

/**
 * VSCode Workspace class
 *
 * @class VSCodeWorkspace
 * @typedef {VSCodeWorkspace}
 */
class VSCodeWorkspace {
	/**
	 * VSCode workspace instance
	 *
	 * @private
	 * @type {typeof VSCode.workspace}
	 */
	private workspace: typeof VSCode.workspace = VSCode.workspace;

	/**
	 * Retrieves current workspace configuration
	 *
	 * @param {string} section - wokspace section identifier name
	 * @returns {VSCode.WorkspaceConfiguration} full workspace configuration
	 */
	getWorkspaceConfiguration(section: string): VSCode.WorkspaceConfiguration {
		return this.workspace.getConfiguration(section);
	}

	/**
	 * Checks if a workspace configuration key is enabled
	 *
	 * @param {string} section - wokspace section identifier name
	 * @param {string} key - workspace section key name
	 * @returns {boolean} true if workspace configuration value return is truthy else false
	 */
	isConfigurationKeyEnabled(section: string, key: string): boolean {
		const workpaceConfiguration = this.getWorkspaceConfiguration(section);
		return Boolean(workpaceConfiguration.get(key, true)) === true;
	}

	/**
	 * Sets a pair key-value in the workspace configuration
	 *
	 * @param {string} section - wokspace section identifier name
	 * @param {string} key - workspace section key name
	 * @param {(string | boolean)} value - value to be added to the workspace configuration
	 * @return {void}
	 */
	setConfigurationKey(section: string, key: string, value: string | boolean): void {
		const workpaceConfiguration = this.getWorkspaceConfiguration(section);
		workpaceConfiguration.update(key, value, VSCode.ConfigurationTarget.Global);
	}

	/**
	 * Gets the workspace URI
	 *
	 * @returns {(VSCode.Uri | undefined)} if defined returns the workspace uri else returns undefined
	 */
	getWorkspaceURI(): VSCode.Uri | undefined {
		console.log("=== VSCodeWorkspace: Get URI ===");
		const workspaceFolders = this.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length) return workspaceFolders[0].uri;
		return;
	}

	/**
	 * Gets the workspace path
	 *
	 * @returns {string} workspace path
	 */
	getWorkspacePath(): string {
		const workspaceURI = this.getWorkspaceURI();
		if (!workspaceURI) throw new Error("[vscodeworkspace_getWorkspacePath] Failed to retrieve workspace URI.");
		return workspaceURI.path;
	}

	/**
	 * Gets the workspace file system path
	 *
	 * @returns {string} workspace file system path
	 */
	getWorkspaceFsPath(): string {
		const workspaceURI = this.getWorkspaceURI();
		if (!workspaceURI) throw new Error("[vscodeworkspace_getWorkspacePath] Failed to retrieve workspace URI.");
		return workspaceURI.fsPath;
	}

	/**
	 * Gets the workspace files for a specific uri
	 *
	 * @async
	 * @param {VSCode.Uri} uri - workspace uri
	 * @returns {Promise<[string, VSCode.FileType][]>} array of names and Vscode file type
	 */
	async getWokspaceFiles(uri: VSCode.Uri): Promise<[string, VSCode.FileType][]> {
		console.log("=== VSCodeWorkspace: Get Workspace Files ===");
		const folderFiles = await this.workspace.fs.readDirectory(uri);
		return folderFiles;
	}

	/**
	 * Gets all the workspace sub folders
	 *
	 * @async
	 * @returns {Promise<string[]>} folders names in the workspace
	 */
	async getWorkspaceSubFolders(): Promise<string[]> {
		console.log("=== VSCodeWorkspace: Get SubFolders ===");
		const workspaceURI = this.getWorkspaceURI();
		if (!workspaceURI)
			throw new Error("[vscodeworkspace_getWorkspaceSubFolders] Failed to retrieve workspace URI.");

		const folderFiles = await this.getWokspaceFiles(workspaceURI);
		return (
			folderFiles
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				.filter(([_, type]) => type === VSCode.FileType.Directory)
				.map(([name]) => name)
		);
	}

	/**
	 * Finds the file system paths of a specific file in the workspace
	 *
	 * @async
	 * @param {string} file - file name
	 * @returns {Promise<string[]>} file path
	 */
	async findWorkspaceFiles(file: string): Promise<string[]> {
		console.log("=== VSCodeWorkspace: findWorkspaceFiles ===");
		const workspaceFiles = await this.workspace.findFiles(file);
		return workspaceFiles.map((file: VSCode.Uri) => file.fsPath);
	}

	/**
	 * Checks if a specific file is in the workspace
	 *
	 * @async
	 * @param {string} file - file name
	 * @returns {Promise<boolean>} true if the file is in the workspace else false
	 */
	async isFileInWorkspaceFolder(file: string): Promise<boolean> {
		console.log("=== VSCodeWorkspace: IsFileInFolder ===");
		const workspaceFiles = await this.findWorkspaceFiles(file);
		return workspaceFiles.length > 0;
	}
}

export default VSCodeWorkspace;
