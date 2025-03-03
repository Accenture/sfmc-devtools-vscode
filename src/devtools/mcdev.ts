import MetadataTypes from "./metadatatypes";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";
import StandardCommands from "./commands/standard";
import TemplatingCommands from "./commands/templating";
import { ConfigDevTools } from "@config";
import { MessagesDevTools } from "@messages";
import { TDevTools, TUtils } from "@types";
import { Lib, File, Terminal } from "utils";

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
	private packageName = ConfigDevTools.mcdevPackageName;
	private configFileName = ConfigDevTools.mcdevConfigurationFile;
	private requiredFiles = ConfigDevTools.mcdevRequiredFiles;

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
	private commandsTypes: Commands[] = [new AdminCommands(), new StandardCommands(), new TemplatingCommands()];

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
	 * Retrieves the name of the configuration file.
	 *
	 * @returns {string} The name of the configuration file.
	 */
	public getConfigFileName(): string {
		return this.configFileName;
	}

	/**
	 * Retrieves the list of required files.
	 *
	 * @returns {string[]} An array of strings representing the required files.
	 */
	public getRequiredFiles(): string[] {
		return this.requiredFiles;
	}

	/**
	 * Retrieves the full path to the configuration file for a given project.
	 *
	 * @param projectPath - The root path of the project.
	 * @returns The full path to the configuration file.
	 */
	public getConfigFilePath(projectPath: string): string {
		return `${projectPath}/${this.getConfigFileName()}`;
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
		this.execute("explainTypes", executeOnResult, { projectPath });
	}

	/**
	 * Retrieves the project credentials configuration from the specified project path.
	 *
	 * @param projectPath - The path to the project directory.
	 * @returns An object containing methods to access project credentials and market configurations.
	 * @returns getAllCredentials - A method that returns an array of all credential keys.
	 * @returns getBusinessUnitsByCredential - A method that returns an array of business unit keys for a given credential.
	 * @returns getMarkets - A method that returns an array of all market keys.
	 * @returns getMarketsList - A method that returns an array of all market list keys.
	 */
	public retrieveProjectCredentialsConfig(projectPath: string): TDevTools.IProjectConfig {
		const configProjectFilePath = Lib.removeLeadingRootDrivePath(this.getConfigFilePath(projectPath));
		const configProjectFile = File.readFileSync(Lib.removeLeadingRootDrivePath(configProjectFilePath));
		const { credentials, markets, marketList }: TDevTools.IConfigFile = JSON.parse(configProjectFile);
		return {
			getAllCredentials: () => (credentials ? Object.keys(credentials) : []),
			getBusinessUnitsByCredential: (credential: string) =>
				credentials[credential].businessUnits ? Object.keys(credentials[credential].businessUnits) : [],
			getMarkets: () => (markets ? Object.keys(markets) : []),
			getMarketsList: () => (marketList ? Object.keys(marketList) : [])
		};
	}

	/**
	 * Convert files paths to DevTools File Format
	 *
	 * @public
	 * @param {string[]} paths - file paths
	 * @returns {TDevTools.IExecuteFileDetails[]} files formatted in DevTool File Format
	 */
	public convertPathsToFiles(paths: string[]): TDevTools.IExecuteFileDetails[] {
		console.log("== Mcdev: Convert File Paths ==");

		const convertToFileFormat = (path: string): TDevTools.IExecuteFileDetails => {
			// Splits file path by 'retrieve' or 'deploy' folder
			const [projectPath, topFolder, relativeFilePath] = path.split(/(\/retrieve\/|\/deploy\/)/g);

			// Top Folder Configuration Fields
			const topFormat: TDevTools.IExecuteFileDetails = { level: "top_folder", projectPath, topFolder, path };

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
			return {} as TDevTools.IExecuteFileDetails;
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
	 * @param {TDevTools.IExecuteFileDetails[]} files - files to be converted
	 * @returns {TDevTools.ICommandParameters[]} - list of command parameters
	 */
	private mapToCommandFileParameters(files: TDevTools.IExecuteFileDetails[]): TDevTools.ICommandFileParameters[] {
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
	 * @param {TDevTools.IExecuteFileDetails} param.level - file level
	 * @param {TDevTools.IExecuteFileDetails} param.credentialsName - credential name
	 * @param {TDevTools.IExecuteFileDetails} param.businessUnit - business unit name
	 * @returns {string} credentials and business name formatted according the DevTools command execution requirement
	 */
	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: TDevTools.IExecuteFileDetails): string {
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
	 * @param {TDevTools.IExecuteFileDetails} param.level - file level
	 * @param {TDevTools.IExecuteFileDetails} param.path - file path
	 * @param {TDevTools.IExecuteFileDetails} param.metadataType - file metadata type
	 * @param {TDevTools.IExecuteFileDetails} param.filename - file name
	 * @returns {(TDevTools.IMetadataCommand | undefined)} metadata command configuration according to DevTools command execution requirement
	 */
	private getMetadataByFileLevel({
		level,
		path,
		metadataType,
		filename
	}: TDevTools.IExecuteFileDetails): TDevTools.IMetadataCommand | undefined {
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
	 * @param {TDevTools.IExecuteFileDetails[]} files - files to be validated
	 * @returns {{ files: TDevTools.IExecuteFileDetails[]; invalidMetadataTypes: string[] }} all the files that passed validation and a list of invalid metadata types
	 */
	private validateFilesByMetadataTypeAction(
		action: string,
		files: TDevTools.IExecuteFileDetails[]
	): { files: TDevTools.IExecuteFileDetails[]; invalidMetadataTypes: string[] } {
		console.log("== Mcdev: Validate Files By Metadata Type Action ==");

		const metadataTypes = this.metadataTypes;
		const invalidMetadataTypes: string[] = [];

		const filterValidMetadataTypes = ({ level, metadataType }: TDevTools.IExecuteFileDetails) => {
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
		parameters: TDevTools.IExecuteParameters
	): Promise<{ success: boolean }> {
		console.log("== Mcdev: Execute ==");

		const invalidMetadataTypes: string[] = [];
		let commandParameters: TDevTools.ICommandParameters = { ...(parameters as TDevTools.ICommandParameters) };

		// Gets the MCDEV command class based on the selected command
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);

		if (!mcdevCommand) throw new Error(`[mcdev_execute]: Invalid mcdev command '${command}'.`);

		if ("filesDetails" in parameters) {
			const filesDetails = parameters.filesDetails as TDevTools.IExecuteFileDetails[];

			// Removes all the selected files that are not supported for the command execution
			const validationResult = this.validateFilesByMetadataTypeAction(command, filesDetails);

			// Convert files to MCDEV Command Parameters
			const filesCommandParameters = this.mapToCommandFileParameters(validationResult.files);

			invalidMetadataTypes.push(...validationResult.invalidMetadataTypes);
			commandParameters = { ...commandParameters, files: filesCommandParameters };
		}

		// Calls the mcdev command to run with the right parameters
		const commandResults = await this.runCommand(mcdevCommand, command, commandParameters, commandHandler);

		// if there is invalid metadata type it will return a unsupported metadata type message
		if (invalidMetadataTypes.length) {
			commandResults.push(false);
			commandHandler({ error: MessagesDevTools.mcdevUnsupportedMetadataTypes(command, invalidMetadataTypes) });
		}
		// Returns success as true if every command execution was successfull
		return { success: commandResults.every(result => result === true) };
	}

	/**
	 * Executes a given mcdev command with specified parameters and handles the output.
	 *
	 * @param mcdevCommand - The mcdev command to be executed.
	 * @param command - The command string to be run.
	 * @param commandParameters - The parameters for the command.
	 * @param commandHandler - A handler function to process the command output.
	 * @returns A promise that resolves to an array of boolean values indicating the success of each command execution.
	 */
	private async runCommand(
		mcdevCommand: Commands,
		command: string,
		commandParameters: TDevTools.ICommandParameters,
		commandHandler: ({ info, output, error }: TUtils.IOutputLogger) => void
	) {
		const commandResults: boolean[] = [];

		const commandConfig = mcdevCommand.run(command, commandParameters);

		for (const [parameters, projectPath] of commandConfig.config) {
			// Command terminal configuration
			const terminalConfig: TUtils.ITerminalCommandRunner = {
				command: this.getPackageName(),
				commandArgs: [commandConfig.alias, parameters],
				commandCwd: projectPath,
				commandHandler: ({ output, error }: TUtils.ITerminalCommandStreams) => commandHandler({ output, error })
			};

			// Logs the command that is being executed
			commandHandler({
				info: `${MessagesDevTools.mcdevRunningCommand} ${this.getPackageName()} ${commandConfig.alias} ${parameters}\n`
			});

			// Executes the command in the terminal
			const { success }: TUtils.ITerminalCommandResult = await Terminal.executeTerminalCommand(
				terminalConfig,
				false
			);

			// Adds the result of the command execution to a list
			commandResults.push(success);
		}

		return commandResults;
	}
}

export default Mcdev;
