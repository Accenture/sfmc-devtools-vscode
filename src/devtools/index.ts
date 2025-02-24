import Mcdev from "./mcdev";
import { ConfigExtension } from "@config";
import { MessagesDevTools, MessagesEditor } from "@messages";
import { EnumsExtension } from "@enums";
import { TDevTools, TEditor, TUtils } from "@types";
import { Lib } from "utils";

/**
 * DevTools Extension class
 *
 * @class DevToolsExtension
 * @typedef {DevToolsExtension}
 */
class DevToolsExtension {
	/**
	 * Vscode Editor class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeEditor}
	 */
	private vscodeEditor: TEditor.VSCodeEditor;
	/**
	 * Mcdev class instance
	 *
	 * @private
	 * @type {Mcdev}
	 */
	private mcdev: Mcdev;

	/**
	 * Creates an instance of DevToolsExtension.
	 *
	 * @constructor
	 * @param {TEditor.IExtensionContext} context - extension context
	 */
	constructor(context: TEditor.IExtensionContext) {
		this.vscodeEditor = new TEditor.VSCodeEditor(context);
		this.mcdev = new Mcdev();
	}

	/**
	 * Initializes the extension
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async init(): Promise<void> {
		console.log("== Init ==");
		// Checks if is there any DevTools Project
		const isDevToolsProject = await this.isDevToolsProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	/**
	 * Checks if the current VSCode workspace has DevTools projects
	 *
	 * @async
	 * @returns {Promise<boolean>} true if there is a DevTools project else false
	 */
	async isDevToolsProject(): Promise<boolean> {
		console.log("== Is Project ==");
		const requiredProjectFiles = this.mcdev.getRequiredFiles() || [];
		// Checks if the required DevTools files exist in the folder/folders
		const filesInFolderResult = await Promise.all(
			requiredProjectFiles.map(
				async file => await this.vscodeEditor.getWorkspace().isFileInWorkspaceFolder(`**/${file}`)
			)
		);
		return filesInFolderResult.every(fileResult => fileResult);
	}

	/**
	 * Initiates the extension configuration methods
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async loadConfiguration(): Promise<void> {
		console.log("== Load Configuration ==");
		try {
			// Check if Mcdev is installed
			const mcdevInstalled = this.mcdev.isInstalled();
			// request user to install mcdev
			if (!mcdevInstalled) await this.mcdevInstall();
			else {
				// activate extension context variables
				this.activateContextVariables();
				// activate recommended extensions
				this.activateRecommendedExtensions();
				// activate editor containers
				this.activateContainers();
				// activate menu commands
				this.activateMenuCommands();
				// logs initial extension information into output channel
				this.writeExtensionInformation();
				// Updates the metadata types file with latest changes
				this.updateMetadataTypesFile();
			}
		} catch (error) {
			// log as debug error
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Installs DevTools package 'mcdev'
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async mcdevInstall(): Promise<void> {
		console.log("== Install Mcdev ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		// Asks user if he wishes to install mcdev
		const userAnswer = await this.showInformationMessage(
			"info",
			MessagesDevTools.noMcdevInstalled,
			Object.keys(EnumsExtension.Confirmation)
		);

		const handleInstallResult = async (success: boolean, error: string): Promise<void> => {
			// if mcdev was successfully installed -> reloads vscode editor window
			// else shows information error message
			if (success) {
				const reload = await this.showInformationMessage("info", MessagesDevTools.mcdevInstallSuccess, [
					"Reload Window"
				]);
				if (reload) vscodeCommands.reloadWorkspace();
			} else {
				this.showInformationMessage("error", MessagesDevTools.mcdevInstallError, []);
				if (error) this.writeLog(this.mcdev.getPackageName(), error, EnumsExtension.LoggerLevel.ERROR);
			}
		};

		if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.Confirmation.Yes) {
			// Shows loading notification
			this.activateNotificationProgressBar(
				MessagesDevTools.mcdevInstallLoading,
				false,
				() =>
					new Promise(resolve => {
						// Installs DevTools package 'mcdev'
						const { success, error }: { success: boolean; error: string } = this.mcdev.install();
						handleInstallResult(success, error);
						resolve(success);
					})
			);
		}
	}

	/**
	 * Activates the extension context variables
	 *
	 * @returns {void}
	 */
	activateContextVariables(): void {
		console.log("== Activate Context Variables ==");
		const vscodeCommands = this.vscodeEditor.getCommands();
		// Sets vscode environment variable 'isproject' to true
		vscodeCommands.executeCommandContext(`${ConfigExtension.extensionName}.config.isproject`, [true]);
	}

	/**
	 * Activates the extension recommended extensions
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async activateRecommendedExtensions(): Promise<void> {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions = ConfigExtension.recommendedExtensions;
		const configurationKey = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions = recommendedExtensions.filter(
			extension => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions = vscodeWorkspace.isConfigurationKeyEnabled(
			ConfigExtension.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer = await this.showInformationMessage(
				"info",
				MessagesEditor.recommendedExtensions,
				Object.keys(EnumsExtension.RecommendedExtensionsOptions)
			);

			// if user clicks on "do not show again" then recommendExtension disabled
			if (
				userAnswer &&
				userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions["Do not show again"]
			)
				vscodeWorkspace.setConfigurationKey(ConfigExtension.extensionName, configurationKey, false);
			// if user clicks on "install" then installs extensions
			if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions.Install)
				vscodeCommands.installExtension(uninstalledExtensions);
		}
	}

	/**
	 * Activates the extension containers
	 *
	 * @returns {void}
	 */
	activateContainers(): void {
		console.log("== Activate Containers ==");
		const vscodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const packageName = this.mcdev.getPackageName();

		// Sets the command when the status bar is clicked
		const statusBarCommand = `${ConfigExtension.extensionName}.openOutputChannel`;
		// Sets the default status bar icon and name
		const statusBarTitle = `$(${EnumsExtension.StatusBarIcon.success}) ${this.mcdev.getPackageName()}`;

		// Registers the status bar command to display the Ouput Channel when clicked
		vscodeCommands.registerCommand({
			command: statusBarCommand,
			callbackAction: () => vscodeWindow.displayOutputChannel(packageName)
		});

		// Creates and displays the Status Bar Item
		vscodeWindow.createStatusBarItem(statusBarCommand, statusBarTitle, packageName);
		vscodeWindow.displayStatusBarItem(packageName);
	}

	/**
	 * Writes initial extension information to the output channel
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async writeExtensionInformation(): Promise<void> {
		const context = this.vscodeEditor.getContext();
		const workspace = this.vscodeEditor.getWorkspace();
		const packageName = this.mcdev.getPackageName();

		// Gets the .mcdevrc file name from the required DevTools file list
		const configFileName = this.mcdev.getConfigFileName();
		// For every devtools project folder in the open workspace it retrieves the complete path of the .mcdevrc file
		const configFsPath = await workspace.findWorkspaceFiles(`**/${configFileName}`);
		// Builds the message to be displayed with the .mcdevrc file path
		const configFilePathMessage = configFsPath.map(path => `${MessagesDevTools.mcdevConfigFile} ${path}`);

		const messages = [
			`Extension name: ${context.getExtensionName()}`,
			`Extension version: ${context.getExtensionVersion()}`,
			...configFilePathMessage
		];
		// Prints the messages to the Output channel
		messages.forEach(message => this.writeLog(packageName, message, EnumsExtension.LoggerLevel.INFO));
	}

	/**
	 * Updates extension containers
	 *
	 * @param {string} containerName - name of the container
	 * @param {{ [key in TEditor.StatusBarFields]?: string }} fields - fields and values to update
	 * @returns {void}
	 */
	updateContainers(containerName: string, fields: { [key in TEditor.StatusBarFields]?: string }): void {
		const vscodeWindow = this.vscodeEditor.getWindow();
		// Updates the status bar container
		vscodeWindow.updateStatusBarItem(containerName, fields);
	}

	/**
	 * Updates the Metadata Types file
	 *
	 * @returns {void}
	 */
	updateMetadataTypesFile(): void {
		try {
			const workspace = this.vscodeEditor.getWorkspace();
			const projectPath = workspace.getWorkspacePath();
			this.mcdev.updateMetadataTypes(projectPath);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Shows a VScode Information message
	 *
	 * @async
	 * @param {("info" | "error")} type - modal message type
	 * @param {string} title - modal message
	 * @param {string[]} options - options in the modal
	 * @returns {Promise<string | undefined>} returs the option the user clicked or undefined if no option was selected
	 */
	async showInformationMessage(
		type: "info" | "error",
		title: string,
		options: string[],
		isModal?: boolean
	): Promise<string | undefined> {
		const vscodeWindow = this.vscodeEditor.getWindow();
		const answer =
			type === "info"
				? await vscodeWindow.showInformationMessageWithOptions(title, options, isModal || false)
				: await vscodeWindow.showErrorMessageWithOptions(title, options);
		return answer;
	}

	/**
	 * Writes logs to output channel according to Logger Level
	 *
	 * @param {string} ouputChannel - ouput channel name
	 * @param {string} message - message to be displayed
	 * @param {EnumsExtension.LoggerLevel} level - logger level
	 * @returns {void}
	 */
	writeLog(ouputChannel: string, message: string, level: EnumsExtension.LoggerLevel): void {
		const timestamp = Lib.getCurrentTime();
		const nonOutputLevel = [EnumsExtension.LoggerLevel.DEBUG, EnumsExtension.LoggerLevel.ERROR];
		// every logger level except output should be in format 'timestamp level: message'
		message = level !== EnumsExtension.LoggerLevel.OUTPUT ? `${timestamp} ${level}: ${message}` : message;

		if (!nonOutputLevel.includes(level)) this.logTextOutputChannel(ouputChannel, message);
		// logs into extension file
	}

	/**
	 * Logs text to a specific Ouput Channel
	 *
	 * @param {string} name - name of the ouput channel
	 * @param {string} text - text to be displayed in the output channel
	 * @returns {void}
	 */
	logTextOutputChannel(name: string, text: string): void {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			vscodeWindow.appendTextToOutputChannel(name, text);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Shows a specific output channel by name
	 *
	 * @param {string} name - name of the channel
	 * @returns {void}
	 */
	showOuputChannel(name: string): void {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			vscodeWindow.displayOutputChannel(name);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	async requestInputWithOptions(options: string[], title: string) {
		const window = this.vscodeEditor.getWindow();
		const userAnswer = await window.showQuickPickOptions(options, title, false);
		return userAnswer && userAnswer.label;
	}

	async openFileInEditor(path: string) {
		try {
			const workspace = this.vscodeEditor.getWorkspace();
			const window = this.vscodeEditor.getWindow();

			const document = await workspace.openDocument(path);
			window.showDocument(document);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Gets the current open tab file path
	 *
	 * @returns {(string | undefined)} - opened file path or undefined otherwise
	 */
	getActiveTabFilePath(): string | undefined {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			return vscodeWindow.getEditorOpenedFilePath();
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
			return;
		}
	}

	/**
	 * Displayes the Vscode In Progress modal
	 *
	 * @param {string} title - message to be displayed in the modal
	 * @param {boolean} cancellable - options to define if the modal is cancellable
	 * @param {TEditor.ProgressBarHandler} progressBarHandler - handler function when showing the in progress modal
	 * @returns {void}
	 */
	activateNotificationProgressBar(
		title: string,
		cancellable: boolean,
		progressBarHandler: TEditor.ProgressBarHandler
	): void {
		const vscodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.showProgressBar(title, "Notification", cancellable, progressBarHandler);
	}

	/**
	 * Registers the extension menu commands
	 *
	 * @returns {void}
	 */
	activateMenuCommands(): void {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		ConfigExtension.menuCommands.forEach(command =>
			// For all the menu commands configured it will register the command and execution action
			vscodeCommands.registerCommand({
				command: `${ConfigExtension.extensionName}.${command}`,
				callbackAction: (files: string[]) => {
					const activeTabFilePath = this.getActiveTabFilePath();
					// When the menu command is done from the file tab it requires the active open file path
					if (!files.length && activeTabFilePath) files = [activeTabFilePath];
					if (files.length) this.executeMenuCommand(command, files);
				}
			})
		);
	}

	/**
	 * Executes the Menu Command by command name
	 *
	 * @param {string} command - command name
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	executeMenuCommand(command: string, files: string[]): void {
		// Filters the paths by parent folder to avoid repeating calling DevTools commands for same files
		const filteredPathsByParent = Lib.removeSubPathsByParent(files);

		// Convert paths to file structure defined for DevTools Commands
		const selectedFiles = this.mcdev.convertPathsToFiles(filteredPathsByParent);

		const menuCommandsHandlers: { [key: string]: () => void } = {
			retrieve: () => this.handleRetrieveCommand(selectedFiles),
			deploy: () => this.handleDeployCommand(selectedFiles),
			delete: () => this.handleDeleteCommand(selectedFiles),
			build: () => this.handleBuildCommand(selectedFiles)
		};

		const menuCommandHandler = menuCommandsHandlers[command];
		if (menuCommandHandler) menuCommandHandler();
		else
			this.writeLog(
				this.mcdev.getPackageName(),
				`[index_executeMenuCommand]: Invalid Menu Command: ${command}`,
				EnumsExtension.LoggerLevel.ERROR
			);
	}

	/**
	 * Handles the Menu Command 'retrieve'
	 *
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	handleRetrieveCommand(files: TDevTools.IExecuteFileDetails[]): void {
		this.executeCommand("retrieve", { filesDetails: files });
	}

	/**
	 * Handles the Menu Command 'deploy'
	 *
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	handleDeployCommand(files: TDevTools.IExecuteFileDetails[]): void {
		this.executeCommand("deploy", { filesDetails: files });
	}

	/**
	 * Handles the Menu Command 'delete'
	 *
	 * @async
	 * @param {string[]} files - selected files paths
	 * @returns {Promise<void>}
	 */
	async handleDeleteCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		const fileNamesList = files.map(file => `${file.filename} (${file.metadataType})`);
		const confirmationAnswer = await this.showInformationMessage(
			"info",
			MessagesEditor.deleteConfirmation(fileNamesList),
			Object.keys(EnumsExtension.Confirmation),
			true
		);
		if (!confirmationAnswer || confirmationAnswer.toLowerCase() !== EnumsExtension.Confirmation.Yes) return;
		this.executeCommand("delete", { filesDetails: files });
	}

	async handleBuildCommand(files: TDevTools.IExecuteFileDetails[]) {
		console.log(files);
		const window = this.vscodeEditor.getWindow();
		const context = this.vscodeEditor.getContext();
		window.createPanel(context.getExtensionPath());
	}
	// async handleBuildCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
	// 	console.log("build command");
	// 	console.log(files);
	// 	const executeParameters: TDevTools.IExecuteParameters = {};

	// 	// Gets the unique project paths for the files selected
	// 	const projectsPaths = Lib.removeDuplicates(files.map(file => file.projectPath)) as string[];

	// 	const showMissingConfigFilePropertyErrorMessage = async (title: string, projectPath: string) => {
	// 		const userOption = await this.showInformationMessage("error", title, ["Open File", "Close"], false);
	// 		if (userOption === "Open File") this.openFileInEditor(this.mcdev.getConfigFilePath(projectPath));
	// 	};

	// 	const selectBuildConfigOption = async (
	// 		optionsList: string[],
	// 		projectPath: string,
	// 		titleMessage: string,
	// 		errorMessage: string
	// 	): Promise<string | undefined> => {
	// 		if (!optionsList.length) showMissingConfigFilePropertyErrorMessage(errorMessage, projectPath);
	// 		else
	// 			return optionsList.length === 1
	// 				? optionsList[0]
	// 				: await this.requestInputWithOptions(optionsList, titleMessage);
	// 		return;
	// 	};

	// 	for (const projectPath of projectsPaths) {
	// 		let buildConfig: TDevTools.IExecuteParameters = {};
	// 		const { getAllCredentials, getBusinessUnitsByCredential, getMarkets, getMarketsList } =
	// 			this.mcdev.retrieveProjectCredentialsConfig(projectPath);

	// 		const allCredentials = getAllCredentials();
	// 		const marketsList = getMarketsList();
	// 		const markets = getMarkets();

	// 		const marketFromSelected = await selectBuildConfigOption(
	// 			markets,
	// 			projectPath,
	// 			MessagesEditor.buildConfigRequestMessage("markets"),
	// 			MessagesEditor.buildConfigUndefinedMessage("markets")
	// 		);
	// 		if (marketFromSelected)
	// 			buildConfig = {
	// 				...buildConfig,
	// 				marketFrom: marketFromSelected
	// 			};

	// 		const bulkAnswer = await this.requestInputWithOptions(
	// 			Object.keys(EnumsExtension.Confirmation),
	// 			MessagesEditor.buildBulkRequestMessage
	// 		);

	// 		if (bulkAnswer && bulkAnswer.toLowerCase() === EnumsExtension.Confirmation.Yes) {
	// 			const marketToSelected = await selectBuildConfigOption(
	// 				marketsList,
	// 				projectPath,
	// 				MessagesEditor.buildConfigRequestMessage("market"),
	// 				MessagesEditor.buildConfigUndefinedMessage("marketList")
	// 			);
	// 			if (marketToSelected) buildConfig = { ...buildConfig, marketTo: marketToSelected, bulk: true };
	// 		} else {
	// 			const credentialSelected = await selectBuildConfigOption(
	// 				allCredentials,
	// 				projectPath,
	// 				MessagesEditor.buildConfigRequestMessage("credentials"),
	// 				MessagesEditor.buildConfigUndefinedMessage("credentials")
	// 			);

	// 			if (credentialSelected) {
	// 				const businessUnits = getBusinessUnitsByCredential(credentialSelected);
	// 				const businessUnitSelected = await selectBuildConfigOption(
	// 					businessUnits,
	// 					projectPath,
	// 					MessagesEditor.buildConfigRequestMessage("business units"),
	// 					MessagesEditor.buildConfigUndefinedMessage("businessUnits")
	// 				);

	// 				if (businessUnitSelected) {
	// 					const marketToSelected = await selectBuildConfigOption(
	// 						markets,
	// 						projectPath,
	// 						MessagesEditor.buildConfigRequestMessage("markets"),
	// 						MessagesEditor.buildConfigUndefinedMessage("markets")
	// 					);
	// 					if (marketToSelected)
	// 						buildConfig = {
	// 							...buildConfig,
	// 							buTo: `${credentialSelected}/${businessUnitSelected}`,
	// 							marketTo: marketToSelected
	// 						};
	// 				}
	// 			}
	// 		}

	// 		if (buildConfig.marketTo && (buildConfig.buTo || "bulk" in buildConfig)) {
	// 			const dependenciesAnswer = await this.requestInputWithOptions(
	// 				Object.keys(EnumsExtension.Confirmation),
	// 				MessagesEditor.buildDependenciesRequestMessage
	// 			);
	// 			buildConfig = {
	// 				...buildConfig,
	// 				dependencies:
	// 					(dependenciesAnswer && dependenciesAnswer.toLowerCase() === EnumsExtension.Confirmation.Yes) ||
	// 					false
	// 			};
	// 		}
	// 		executeParameters[projectPath] = buildConfig;
	// 		console.log(executeParameters);
	// 	}
	//}

	/**
	 * Executes the extension menu commands
	 *
	 * @param {string} command - extension command
	 * @param {string[]} files - file paths detected by selection
	 * @returns {void}
	 */
	executeCommand(command: string, executeParameters: TDevTools.IExecuteParameters): void {
		console.log("== Execute Menu Commands ==");
		const packageName = this.mcdev.getPackageName();
		// inital running command status bar configuration
		const initialStatusBarColor = "";
		const initialStatusBarIcon: string =
			EnumsExtension.StatusBarIcon[command as keyof typeof EnumsExtension.StatusBarIcon];
		const initialStatusBarTitle = `$(${initialStatusBarIcon}) ${packageName}`;
		const inProgressBarTitle = MessagesEditor.runningCommand;

		const mcdevExecuteOnOutput = ({ info = "", output = "", error = "" }: TUtils.IOutputLogger) => {
			const message = info || output || error;

			let loggerLevel = EnumsExtension.LoggerLevel.DEBUG;
			if (info) loggerLevel = EnumsExtension.LoggerLevel.INFO;
			if (output) loggerLevel = EnumsExtension.LoggerLevel.OUTPUT;
			if (error) loggerLevel = EnumsExtension.LoggerLevel.WARN;

			this.writeLog(packageName, message, loggerLevel);
		};

		const mcdevExecuteOnResult = async (success: boolean) => {
			const statusBarIcon = success ? EnumsExtension.StatusBarIcon.success : EnumsExtension.StatusBarIcon.error;
			// changes the status bar icon and and color according to the execution result of the command
			const newStatusBarColor = success ? initialStatusBarColor : "error";
			const newStatusBarTitle = `$(${statusBarIcon}) ${packageName}`;

			// Sets the message to show in the modal depending on the execution result
			const infoMessage = success ? MessagesEditor.runningCommandSuccess : MessagesEditor.runningCommandFailure;

			// Options to be displayed in the modal message
			const infoMessageOptions = ["More Details"];

			this.updateContainers(packageName, { text: newStatusBarTitle, backgroundColor: newStatusBarColor });

			if (!success)
				// Changes back the status bar icon and backaground color to inital configuration after some time
				Lib.executeAfterDelay(
					() =>
						this.updateContainers(packageName, {
							text: `$(${EnumsExtension.StatusBarIcon.success}) ${packageName}`,
							backgroundColor: initialStatusBarColor
						}),
					ConfigExtension.delayTimeUpdateStatusBar
				);

			const moreDetails = await this.showInformationMessage(
				success ? "info" : "error",
				infoMessage,
				infoMessageOptions
			);
			// if user clicks on 'More Details' button it will open the output channel
			if (moreDetails) this.showOuputChannel(packageName);
		};

		this.updateContainers(packageName, { text: initialStatusBarTitle, backgroundColor: initialStatusBarColor });
		// Execute the commands asynchronously
		this.activateNotificationProgressBar(
			inProgressBarTitle,
			false,
			() =>
				new Promise(async resolve => {
					const { success }: { success: boolean } = await this.mcdev.execute(
						command,
						mcdevExecuteOnOutput,
						executeParameters
					);
					mcdevExecuteOnResult(success);
					resolve(success);
				})
		);
	}
}
export default DevToolsExtension;
