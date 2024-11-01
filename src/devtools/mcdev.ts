import MetadataTypes from "./metadatatypes";
import StandardCommands from "./commands/standard";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";
import { MessagesDevTools } from "@messages";
import { TDevTools, TUtils } from "@types";
import { Lib, Terminal } from "utils";

/**
 * Mcdev class
 *
 * @class Mcdev
 * @typedef {Mcdev}
 */
class Mcdev {
	/**
	 * DevTools package name
	 *
	 * @private
	 * @type {string}
	 */
	private packageName = "mcdev";
	/**
	 * MetadataTypes class instance
	 *
	 * @private
	 * @type {MetadataTypes}
	 */
	private metadataTypes: MetadataTypes;
	/**
	 * List of Commands
	 *
	 * @private
	 * @type {Commands[]}
	 */
	private commandsTypes: Commands[] = [new AdminCommands(), new StandardCommands()];

	/**
	 * Creates an instance of Mcdev.
	 *
	 * @constructor
	 */
	constructor() {
		this.metadataTypes = new MetadataTypes();
	}

	/**
	 * Gets Mcdev package name
	 *
	 * @public
	 * @returns {string} package name
	 */
	public getPackageName(): string {
		return this.packageName;
	}

	/**
	 * Checks if Mcdev package is installed
	 *
	 * @public
	 * @returns {boolean} true if mcdev package is installed else false
	 */
	public isInstalled(): boolean {
		return Terminal.isPackageInstalled(this.packageName);
	}

	/**
	 * Installs Mcdev package
	 *
	 * @public
	 * @returns {{ success: boolean; error: string }} returns success or error after installing the package
	 */
	public install(): { success: boolean; error: string } {
		console.log("== Mcdev: Install ==");
		try {
			const terminalOutcome = Terminal.installPackage(this.packageName);
			return { success: terminalOutcome.success, error: terminalOutcome.stdStreams.error };
		} catch (error) {
			return { success: false, error: `${error}` };
		}
	}

	/**
	 * Executes the Mcdev command "ExplainTypes" to update the Metadata Types file
	 *
	 * @public
	 * @async
	 * @param {string} projectPath - current project path
	 * @returns {Promise<void>}
	 */
	public async updateMetadataTypes(projectPath: string): Promise<void> {
		console.log("== Mcdev: Update MetadataType ==");
		const executeOnResult = ({ output, error }: TUtils.IOutputLogger) => {
			if (error) throw new Error(`[mcdev_updateMetadataTypes]: ${error}`);
			if (output) this.metadataTypes.updateMetadataTypes(output);
		};
		this.execute("explainTypes", executeOnResult, [projectPath]);
	}

	/**
	 * Convert files paths to DevTools File Format
	 *
	 * @public
	 * @param {string[]} paths - file paths
	 * @returns {TDevTools.IFileFormat[]} files formatted in DevTool File Format
	 */
	public convertPathsToFiles(paths: string[]): TDevTools.IFileFormat[] {
		console.log("== Mcdev: Convert File Paths ==");

		const convertToFileFormat = (path: string): TDevTools.IFileFormat => {
			// Splits file path by 'retrieve' or 'deploy' folder
			const [projectPath, topFolder, relativeFilePath] = path.split(/(\/retrieve\/|\/deploy\/)/g);

			// Top Folder Configuration Fields
			const topFormat: TDevTools.IFileFormat = { level: "top_folder", projectPath, topFolder, path };

			// If file is the retrieve or deploy folder
			if (projectPath && !relativeFilePath) return topFormat;

			// Else get the folder structure for the file according to mcdev folder structure:
			// Credentials Name -> Business Unit -> MetadataType -> file or folder (Asset/Folders)
			const [credentialsName, businessUnit, metadataType, ...fileParts] = relativeFilePath.split("/");
			if (fileParts.length) {
				const { filename, metadataTypeName } = this.metadataTypes.handleFileConfiguration(
					metadataType,
					fileParts
				);
				return {
					...topFormat,
					level: "file",
					credentialsName,
					businessUnit,
					metadataType: metadataTypeName || metadataType,
					filename
				};
			}
			if (metadataType) return { ...topFormat, level: "mdt_folder", credentialsName, businessUnit, metadataType };
			if (businessUnit) return { ...topFormat, level: "bu_folder", credentialsName, businessUnit };
			if (credentialsName) return { ...topFormat, level: "cred_folder", credentialsName };
			return {} as TDevTools.IFileFormat;
		};
		return paths.map(convertToFileFormat);
	}

	/**
	 * Retrieves Command by sub command name
	 *
	 * @private
	 * @param {string} name - name of the sub command
	 * @returns {Commands} Command class instance
	 */
	private getCommandBySubCommandName(name: string): Commands {
		console.log("== Mcdev: Get Command By Sub Command name ==");
		const [mcdevCommand]: Commands[] = Object.values(this.commandsTypes).filter((mcdevCommand: Commands) =>
			mcdevCommand.commandsList().includes(name)
		);
		return mcdevCommand;
	}

	/**
	 * Maps DevTools Files Format to Command Parameters
	 *
	 * @private
	 * @param {TDevTools.IFileFormat[]} files - files to be converted
	 * @returns {TDevTools.ICommandParameters[]} - list of command parameters
	 */
	private mapToCommandParameters(files: TDevTools.IFileFormat[]): TDevTools.ICommandParameters[] {
		type MetadataByCredential = {
			[projectPath: string]: { [topFolder: string]: { [credential: string]: TDevTools.IMetadataCommand[] } };
		};
		// Appends all selected metadata files mapped by credential name
		const metadataByCredential = files.reduce((mdtByCred, file) => {
			const { projectPath, topFolder } = file;
			const credential = this.getCredentialByFileLevel(file);
			const metadata = this.getMetadataByFileLevel(file);

			mdtByCred[projectPath] = mdtByCred[projectPath] || {};
			mdtByCred[projectPath][topFolder] = mdtByCred[projectPath][topFolder] || {};
			mdtByCred[projectPath][topFolder][credential] = mdtByCred[projectPath][topFolder][credential] || [];

			if (metadata) mdtByCred[projectPath][topFolder][credential].push(metadata);
			return mdtByCred;
		}, {} as MetadataByCredential);

		// Maps to the Command Parameters format
		return Object.entries(metadataByCredential).flatMap(([projectPath, projectTopFolder]) =>
			Object.entries(projectTopFolder).flatMap(([topFolder, credentials]) =>
				Object.entries(credentials).map(([credential, metadata]) => ({
					credential,
					metadata,
					projectPath,
					topFolder
				}))
			)
		);
	}

	/**
	 * Gets credential naming convention by file level
	 *
	 * @private
	 * @param {TDevTools.IFileFormat} param.level - file level
	 * @param {TDevTools.IFileFormat} param.credentialsName - credential name
	 * @param {TDevTools.IFileFormat} param.businessUnit - business unit name
	 * @returns {string} credentials and business name formatted according the DevTools command execution requirement
	 */
	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: TDevTools.IFileFormat): string {
		switch (level) {
			case "top_folder":
				return "*";
			case "cred_folder":
				return `${credentialsName}/*`;
			default:
				return `${credentialsName}/${businessUnit}`;
		}
	}

	/**
	 * Gets Metadata Type Configuration by file level
	 *
	 * @private
	 * @param {TDevTools.IFileFormat} param.level - file level
	 * @param {TDevTools.IFileFormat} param.path - file path
	 * @param {TDevTools.IFileFormat} param.metadataType - file metadata type
	 * @param {TDevTools.IFileFormat} param.filename - file name
	 * @returns {(TDevTools.IMetadataCommand | undefined)} metadata command configuration according to DevTools command execution requirement
	 */
	private getMetadataByFileLevel({
		level,
		path,
		metadataType,
		filename
	}: TDevTools.IFileFormat): TDevTools.IMetadataCommand | undefined {
		switch (level) {
			case "mdt_folder":
				return { metadatatype: metadataType as string, key: "", path };
			case "file":
				return { metadatatype: metadataType as string, key: filename || "", path };
			default:
				return undefined;
		}
	}

	/**
	 * Checks if a Metadata Type is supported for a specific execution command action
	 *
	 * @private
	 * @param {string} action - command actions
	 * @param {TDevTools.IFileFormat[]} files - files to be validated
	 * @returns {{ files: TDevTools.IFileFormat[]; invalidMetadataTypes: string[] }} all the files that passed validation and a list of invalid metadata types
	 */
	private validateFilesByMetadataTypeAction(
		action: string,
		files: TDevTools.IFileFormat[]
	): { files: TDevTools.IFileFormat[]; invalidMetadataTypes: string[] } {
		console.log("== Mcdev: Validate Files By Metadata Type Action ==");

		const metadataTypes = this.metadataTypes;
		const invalidMetadataTypes: string[] = [];

		const filterValidMetadataTypes = ({ level, metadataType }: TDevTools.IFileFormat) => {
			if (level !== "mdt_folder" && level !== "file") return true;
			// Checks if the metadata type is supported for the command action
			const isValidMetadataType: boolean =
				metadataType !== undefined && metadataTypes.isSupportedMetadataTypeByAction(action, metadataType);
			// Adds all the metadata types that are not supported into a list
			if (!isValidMetadataType && metadataType) invalidMetadataTypes.push(metadataType);
			return isValidMetadataType;
		};
		if (metadataTypes.isValidSupportedAction(action)) files = files.filter(filterValidMetadataTypes);
		return { files, invalidMetadataTypes: Lib.removeDuplicates(invalidMetadataTypes) as string[] };
	}

	/**
	 * Executes the DevTools Command
	 *
	 * @public
	 * @async
	 * @param {string} command - command name
	 * @param {({ info, output, error }: TUtils.IOutputLogger) => void} commandHandler - command handler
	 * @param {string[]} filePaths - file paths
	 * @returns {Promise<{ success: boolean }>} success is true if command executed successfully otherwise false
	 */
	public async execute(
		command: string,
		commandHandler: ({ info, output, error }: TUtils.IOutputLogger) => void,
		filePaths: string[]
	): Promise<{ success: boolean }> {
		console.log("== Mcdev: Execute ==");

		// Gets the MCDEV command class based on the selected command
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);

		// Filters the paths by parent folder to avoid repeating calling MCDEV commands for same files
		const filteredPathsByParent = Lib.removeSubPathsByParent(filePaths);

		// Convert paths to file structure following MCDEV command requirements
		const selectedFiles = this.convertPathsToFiles(filteredPathsByParent);

		// Removes all the selected files that are not supported for the command execution
		const { files, invalidMetadataTypes } = this.validateFilesByMetadataTypeAction(command, selectedFiles);

		// Convert files to MCDEV Command Parameters
		const commandParameters = this.mapToCommandParameters(files);

		const commandResults: boolean[] = [];
		// Calls the mcdev command to run with the right parameters
		if (mcdevCommand && commandParameters.length) {
			const commandConfig = mcdevCommand.run(command, commandParameters);
			for (const [parameters, projectPath] of commandConfig.config) {
				// Command terminal configuration
				const terminalConfig: TUtils.ITerminalCommandRunner = {
					command: this.getPackageName(),
					commandArgs: [commandConfig.alias, parameters],
					commandCwd: projectPath,
					commandHandler: ({ output, error }: TUtils.ITerminalCommandStreams) =>
						commandHandler({ output, error })
				};
				commandHandler({
					info: `${MessagesDevTools.mcdevRunningCommand} ${this.getPackageName()} ${commandConfig.alias} ${parameters}\n`
				});

				const { success }: TUtils.ITerminalCommandResult = await Terminal.executeTerminalCommand(
					terminalConfig,
					false
				);
				// Adds the result of the command execution to a list
				commandResults.push(success);
			}
		}

		// if there is invalid metadata type it will return a unsupported metadata type message
		if (invalidMetadataTypes.length) {
			commandResults.push(false);
			commandHandler({ error: MessagesDevTools.mcdevUnsupportedMetadataTypes(command, invalidMetadataTypes) });
		}
		// Returns success as true if every command execution was successfull
		return { success: commandResults.every(result => result === true) };
	}
}

export default Mcdev;
