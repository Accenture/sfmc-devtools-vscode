import MetadataTypes from "./metadatatypes";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";
import StandardCommands from "./commands/standard";
import TemplatingCommands from "./commands/templating";
import { ConfigDevTools } from "@config";
import { MessagesDevTools } from "@messages";
import { TDevTools, TUtils } from "@types";
import { Lib, File, Terminal } from "utils";
import { McdevInvocation } from "./mcdevResolve";

export interface McdevUpgradeContext {
	projectPath: string;
	invocation: McdevInvocation;
}

export interface McdevExecutionResult {
	success: boolean;
	upgradeRequiredProjectPaths?: string[];
	upgradeRequiredProjects?: McdevUpgradeContext[];
}

/**
 * Mcdev class
 *
 * @class Mcdev
 * @typedef {Mcdev}
 */
class Mcdev {
	private packageName: string = ConfigDevTools.mcdevPackageName;
	private configFileName: string = ConfigDevTools.mcdevConfigurationFile;
	private requiredFiles: string[] = ConfigDevTools.mcdevRequiredFiles;

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
	constructor(private readonly resolveInvocation?: (projectPath: string) => McdevInvocation) {
		this.metadataTypes = new MetadataTypes();
	}

	/** Resolve the selected runtime afresh for each project invocation. */
	public getInvocation(projectPath: string): McdevInvocation {
		if (!this.resolveInvocation) throw new Error("mcdev runtime resolver is not configured.");
		return this.resolveInvocation(projectPath);
	}

	/** Probe the selected CLI, never a literal PATH mcdev. */
	public async lookupVersion(projectPath: string): Promise<TUtils.ITerminalCommandResult> {
		return this.lookupInvocationVersion(this.getInvocation(projectPath));
	}

	/** Probe the captured runtime without resolving the current source setting again. */
	public async lookupInvocationVersion(invocation: McdevInvocation): Promise<TUtils.ITerminalCommandResult> {
		return Terminal.executeTerminalCommandCapture({
			command: this.packageName,
			commandArgs: ["--version"],
			invocation
		});
	}

	/** Run an explicitly confirmed upgrade using the runtime that reported the failure. */
	public async executeConfirmedUpgrade(
		context: McdevUpgradeContext,
		commandHandler: (entry: TUtils.IOutputLogger) => void,
		cancellationToken?: TUtils.ICancellationToken
	): Promise<McdevExecutionResult> {
		return this.runCommand(
			this.getCommandBySubCommandName("upgrade"),
			"upgrade",
			{ projectPath: context.projectPath },
			commandHandler,
			cancellationToken,
			context.invocation
		);
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
		try {
			const terminalOutcome = Terminal.installPackage(this.packageName);
			return { success: terminalOutcome.success, error: terminalOutcome.stdStreams.error };
		} catch (error) {
			return { success: false, error: `${error}` };
		}
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
	 * Runs 'mcdev explainTypes --json' asynchronously and returns the parsed type list.
	 * Returns null if the command fails or the output cannot be parsed; the reason is passed to `onError`.
	 *
	 * @public
	 * @param {string} projectPath - working directory path for mcdev
	 * @param {(reason: string) => void} [onError] - receives a human-readable failure reason
	 * @param {number} [timeoutMs] - kill the CLI call after this many milliseconds
	 * @returns {Promise<TDevTools.IMetadataTypes[] | null>} parsed metadata types or null on failure
	 */
	public async runExplainTypes(
		projectPath: string,
		onError?: (reason: string) => void,
		timeoutMs = 60_000
	): Promise<TDevTools.IMetadataTypes[] | null> {
		try {
			const result = await Terminal.executeTerminalCommandCapture({
				command: this.packageName,
				commandArgs: ["et", "--json"],
				invocation: this.getInvocation(projectPath),
				timeoutMs
			});

			if (!result.success) {
				onError?.(`'et --json' failed: ${result.stdStreams.error || result.stdStreams.output || "no output"}`);
				return null;
			}
			const types = Mcdev.parseExplainTypes(result.stdStreams.output);
			if (!types) onError?.("could not find a JSON array in the 'et --json' output");
			return types;
		} catch (error) {
			onError?.(String(error));
			return null;
		}
	}

	/**
	 * Extracts the JSON array from `mcdev et --json` output, tolerating banner/log lines
	 * (which may themselves contain "[") before the array.
	 *
	 * @param {string} output - raw stdout
	 * @returns {TDevTools.IMetadataTypes[] | null} parsed types or null if no valid array is found
	 */
	public static parseExplainTypes(output: string): TDevTools.IMetadataTypes[] | null {
		const isType = (e: unknown): boolean => {
			const t = e as { apiName?: unknown; supports?: unknown } | null;
			return !!t && typeof t === "object" && typeof t.apiName === "string" && typeof t.supports === "object";
		};
		let start = output.indexOf("[");
		while (start !== -1) {
			const end = Mcdev.findMatchingBracket(output, start);
			if (end !== -1) {
				try {
					const parsed: unknown = JSON.parse(output.slice(start, end + 1));
					// only accept a non-empty array of type descriptors (an empty/foreign array would wipe the list)
					if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isType))
						return parsed as TDevTools.IMetadataTypes[];
				} catch {
					// not the array we want; try the next "["
				}
			}
			start = output.indexOf("[", start + 1);
		}
		return null;
	}

	/**
	 * Finds the "]" closing the "[" at `start`, ignoring brackets inside JSON strings.
	 *
	 * @param {string} text - text to scan
	 * @param {number} start - index of the opening "["
	 * @returns {number} index of the matching "]" or -1 if unbalanced
	 */
	private static findMatchingBracket(text: string, start: number): number {
		let depth = 0;
		let inString = false;
		for (let i = start; i < text.length; i++) {
			const c = text[i];
			if (inString) {
				if (c === "\\") i++;
				else if (c === '"') inString = false;
			} else if (c === '"') inString = true;
			else if (c === "[") depth++;
			else if (c === "]" && --depth === 0) return i;
		}
		return -1;
	}

	/**
	 * Updates the internal metadata types list with a new set of types.
	 * Returns true when the list was changed (new, removed, or modified types detected).
	 *
	 * @public
	 * @param {TDevTools.IMetadataTypes[]} types - updated metadata types list
	 * @returns {boolean} true if the list changed, false otherwise
	 */
	public updateMetadataTypes(types: TDevTools.IMetadataTypes[]): boolean {
		return this.metadataTypes.updateMetadataTypes(types);
	}

	/**
	 * Retrieves the metadata types supported by a given action.
	 *
	 * @param {string} action - The action for which to retrieve supported metadata types.
	 * @returns {TDevTools.IMetadataTypes[]} An array of metadata types supported by the specified action.
	 * @throws {Error} Throws an error if the provided action is not valid.
	 */
	public retrieveSupportedMetadataDataTypes(action: string): TDevTools.IMetadataTypes[] {
		if (!this.metadataTypes.isValidSupportedAction(action))
			throw new Error(
				`[mcdev_retrieveSupportedMetadataDataTypes]: Invalid Metadata Type supported action '${action}'.`
			);
		return this.metadataTypes.getMetaDataTypesSupportedByAction(action);
	}

	/**
	 * Checks whether the given action is supported for a specific metadata type apiName.
	 *
	 * @param {string} action - action name (e.g. "delete", "deploy")
	 * @param {string} apiName - metadata type API name, optionally with subtype suffix
	 * @returns {boolean} true if the action is supported or if the type is not in the cache
	 */
	public isActionSupportedForType(action: string, apiName: string): boolean {
		return this.metadataTypes.isActionSupportedForType(action, apiName);
	}

	/**
	 * Convert files paths to DevTools File Format
	 *
	 * @public
	 * @param {string[]} paths - file paths
	 * @returns {TDevTools.IExecuteFileDetails[]} files formatted in DevTool File Format
	 */
	public convertPathsToFiles(paths: string[]): TDevTools.IExecuteFileDetails[] {
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
		metadataSubKey,
		filename
	}: TDevTools.IExecuteFileDetails): TDevTools.IMetadataCommand | undefined {
		switch (level) {
			case "mdt_folder":
				return { metadatatype: metadataType as string, key: "", path };
			case "file":
				return {
					metadatatype: metadataType as string,
					key: filename || "",
					...(metadataSubKey ? { subKey: metadataSubKey } : {}),
					path
				};
			default:
				return undefined;
		}
	}

	/**
	 * Executes the DevTools Command
	 *
	 * @public
	 * @async
	 * @param {string} command - command name
	 * @param {({ info, output, error }: TUtils.IOutputLogger) => void} commandHandler - command handler
	 * @param {string[]} filePaths - file paths
	 * @param {TUtils.ICancellationToken} [cancellationToken] - optional token to cancel the running command
	 * @returns {Promise<{ success: boolean }>} success is true if command executed successfully otherwise false
	 */
	public async execute(
		command: string,
		commandHandler: ({ info, output, error }: TUtils.IOutputLogger) => void,
		parameters: TDevTools.IExecuteParameters,
		cancellationToken?: TUtils.ICancellationToken
	): Promise<McdevExecutionResult> {
		let commandParameters: TDevTools.ICommandParameters = { ...(parameters as TDevTools.ICommandParameters) };

		// Gets the MCDEV command class based on the selected command
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);

		if (!mcdevCommand) throw new Error(`[mcdev_execute]: Invalid mcdev command '${command}'.`);

		if ("filesDetails" in parameters) {
			const filesDetails = parameters.filesDetails as TDevTools.IExecuteFileDetails[];

			// Convert files to MCDEV Command Parameters
			const filesCommandParameters = this.mapToCommandFileParameters(filesDetails);

			commandParameters = { ...commandParameters, files: filesCommandParameters };
		}

		// Calls the mcdev command to run with the right parameters
		const commandResults = await this.runCommand(
			mcdevCommand,
			command,
			commandParameters,
			commandHandler,
			cancellationToken
		);

		return commandResults;
	}

	/**
	 * Executes a given mcdev command with specified parameters and handles the output.
	 *
	 * @param mcdevCommand - The mcdev command to be executed.
	 * @param command - The command string to be run.
	 * @param commandParameters - The parameters for the command.
	 * @param commandHandler - A handler function to process the command output.
	 * @param cancellationToken - An optional token to cancel the running command.
	 * @returns Combined success and project paths with explicit upgrade guidance.
	 */
	private async runCommand(
		mcdevCommand: Commands,
		command: string,
		commandParameters: TDevTools.ICommandParameters,
		commandHandler: ({ info, output, error }: TUtils.IOutputLogger) => void,
		cancellationToken?: TUtils.ICancellationToken,
		capturedInvocation?: McdevInvocation
	): Promise<McdevExecutionResult> {
		const commandResults: boolean[] = [];
		const upgradeRequiredProjects = new Map<string, McdevUpgradeContext>();

		const commandConfig = mcdevCommand.run(command, commandParameters);

		// If the command carries a pre-run informational message (e.g. because the delete
		// command was split into multiple invocations due to command-line length limits),
		// log it once before executing any of the chunks.
		if (commandConfig.preRunInfo) {
			commandHandler({ info: `${commandConfig.preRunInfo}\n` });
		}

		for (const [parameters, projectPath] of commandConfig.config) {
			if (cancellationToken?.isCancellationRequested) break;

			// Bound each stream's tail independently, preserving whitespace at chunk boundaries.
			const guidance = "Run 'mcdev upgrade' now to fix this.";
			const tails = { output: "", error: "" };
			let requiresUpgrade = false;
			const selected = capturedInvocation ?? this.getInvocation(projectPath);
			const invocation = { ...selected, prefixArgs: [...selected.prefixArgs] };

			// Command terminal configuration
			const terminalConfig: TUtils.ITerminalCommandRunner = {
				command: this.getPackageName(),
				commandArgs: [commandConfig.alias, parameters],
				invocation,
				rawChunkHandler: (chunk, stream) => {
					const text = tails[stream] + chunk;
					requiresUpgrade ||= text.includes(guidance);
					tails[stream] = text.slice(-(guidance.length - 1));
				},
				commandHandler: ({ output, error }) => commandHandler({ output, error }),
				cancellationToken
			};

			commandHandler({ info: `Selected mcdev source: ${terminalConfig.invocation?.source}\n` });
			// Logs the command that is being executed
			commandHandler({
				info: `${MessagesDevTools.mcdevRunningCommand} ${this.getPackageName()} ${commandConfig.alias} ${parameters}\n`
			});

			// Executes the command in the terminal
			const { success }: TUtils.ITerminalCommandResult = await Terminal.executeTerminalCommand(
				terminalConfig,
				false
			);

			if (!success && requiresUpgrade && command !== "upgrade" && !cancellationToken?.isCancellationRequested)
				upgradeRequiredProjects.set(projectPath, { projectPath, invocation });

			// Adds the result of the command execution to a list
			commandResults.push(success);
		}

		return {
			success: commandResults.every(result => result === true),
			...(upgradeRequiredProjects.size
				? {
						upgradeRequiredProjectPaths: [...upgradeRequiredProjects.keys()],
						upgradeRequiredProjects: [...upgradeRequiredProjects.values()]
					}
				: {})
		};
	}
}

export default Mcdev;
