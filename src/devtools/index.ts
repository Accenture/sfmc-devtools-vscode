import Mcdev from "./mcdev";
import { ConfigExtension } from "@config";
import { MessagesDevTools, MessagesEditor } from "@messages";
import { EnumsDevTools, EnumsExtension } from "@enums";
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
		// Shows the modal message with the title and options
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
		console.log(message); // TODO: remove console.log and add to log file
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

	/**
	 * Prompts the user with a selection of options and returns their choice.
	 *
	 * @param options - An array of strings representing the options to present to the user.
	 * @param title - The title of the prompt window.
	 * @param multipleOptions - A boolean indicating whether multiple options can be selected.
	 * @returns A promise that resolves to the user's selection. If `multipleOptions` is true,
	 *          it returns an array of selected options. If `multipleOptions` is false, it
	 *          returns a single selected option. If the user cancels the prompt, it returns `undefined`.
	 */
	async requestInputWithOptions(
		options: string[],
		title: string,
		multipleOptions: boolean
	): Promise<string | string[] | undefined> {
		const window = this.vscodeEditor.getWindow();
		const userAnswer = await window.showQuickPickOptions(options, title, multipleOptions);
		// Returns the user's selection or undefined if the user cancels the prompt
		if (!userAnswer) return;
		// Returns the selected options as an array if multiple options can be selected
		if (Array.isArray(userAnswer)) return userAnswer.map(answer => answer.label);
		// Returns the selected option as a string if only one option can be selected
		return userAnswer.label;
	}

	/**
	 * Opens a file in the editor given its path.
	 *
	 * @param path - The path of the file to open.
	 * @returns A promise that resolves when the file is opened in the editor.
	 *
	 * @throws Will log an error if the file cannot be opened.
	 */
	async openFileInEditor(path: string): Promise<void> {
		try {
			const workspace = this.vscodeEditor.getWorkspace();
			const window = this.vscodeEditor.getWindow();

			// Opens the file in the editor
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
		// Convert paths to file structure defined for DevTools Commands
		const selectedFiles = this.mcdev.convertPathsToFiles(files);

		// menu commands handlers
		const menuCommandsHandlers: { [key: string]: () => void } = {
			copytobu: () => this.handleCopyToBUCommand(selectedFiles),
			delete: () => this.handleDeleteCommand(selectedFiles),
			deploy: () => this.handleDeployCommand(selectedFiles),
			retrieve: () => this.handleRetrieveCommand(selectedFiles)
		};

		const menuCommandHandler = menuCommandsHandlers[command];
		// Executes the menu command handler
		if (menuCommandHandler) menuCommandHandler();
		else
			this.writeLog(
				this.mcdev.getPackageName(),
				`[index_executeMenuCommand]: Invalid Menu Command: ${command}`,
				EnumsExtension.LoggerLevel.ERROR
			);
	}

	/**
	 * Handles the "Copy to BU" command by requesting user input for the action to perform,
	 * selecting the target business units, and executing the appropriate commands.
	 *
	 * @param files - An array of file details to be processed.
	 * @returns A promise that resolves when the command execution is complete.
	 * @throws Will log and handle any errors that occur during the execution.
	 */
	async handleCopyToBUCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		try {
			// Request user to select the action to perform
			const userCopyToBUAnswer = (await this.requestInputWithOptions(
				Object.keys(EnumsDevTools.CopyToBUOptions),
				MessagesEditor.copyToBuPrompt,
				false
			)) as string | undefined;

			// If no action is selected, return
			if (!userCopyToBUAnswer) return;
			// Get the selected project paths without deplicates
			const selectedProjectPaths = Lib.removeDuplicates(files.map(file => file.projectPath)) as string[];

			// For each selected project path
			selectedProjectPaths.forEach(async selectedProjectPath => {
				// Filter the files by the selected project path
				const filesByProject = files.filter(file => file.projectPath === selectedProjectPath);

				// Select the business units for the selected project path
				const selectedBUs = (await this.selectBusinessUnits(selectedProjectPath, {
					multiBUs: false
				})) as string[];

				if (!selectedBUs.length) return;

				// Execute the 'clone' command with the selected files and business units
				await this.executeCommand("clone", {
					filesDetails: filesByProject,
					targetBusinessUnit: selectedBUs
				});

				// If the user selected the 'Copy And Deploy' option, deploy the copied files to the selected business units
				if (userCopyToBUAnswer.toLowerCase() === EnumsDevTools.CopyToBUOptions["Copy And Deploy"]) {
					const targetBUsFiles = selectedBUs.flatMap(selectedBU =>
						filesByProject.map(file =>
							file.path.replace(
								`/retrieve/${file.credentialsName}/${file.businessUnit}`,
								`/deploy/${selectedBU}`
							)
						)
					);
					// Execute the 'deploy' command with the selected files and target business units
					this.executeMenuCommand("deploy", targetBUsFiles);
				}
			});
		} catch (error) {
			// Show error message if no credentials are found in the mcdevrc file
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
			// Update the status bar with the error message
			this.updateStatusBar(
				this.mcdev.getPackageName(),
				this.getStatusBarTitle("error", this.mcdev.getPackageName()),
				"error"
			);
		}
	}

	/**
	 * Handles the Menu Command 'delete'
	 *
	 * @async
	 * @param {string[]} files - selected files paths
	 * @returns {Promise<void>}
	 */
	async handleDeleteCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		// Get the file names and metadata types to display in the confirmation message
		const fileNamesList = files.map(file => `${file.filename} (${file.metadataType})`);
		// Request user confirmation to delete the selected files
		const confirmationAnswer = await this.showInformationMessage(
			"info",
			MessagesEditor.deleteConfirmation(fileNamesList),
			Object.keys(EnumsExtension.Confirmation),
			true
		);
		// If the user cancels the confirmation, return
		if (!confirmationAnswer || confirmationAnswer.toLowerCase() !== EnumsExtension.Confirmation.Yes) return;
		// Execute the 'delete' command
		this.executeCommand("delete", { filesDetails: files });
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
	 * Handles the Menu Command 'retrieve'
	 *
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	handleRetrieveCommand(files: TDevTools.IExecuteFileDetails[]): void {
		// Get the selected project paths without deplicates
		const selectedProjectPaths = Lib.removeDuplicates(files.map(file => file.projectPath)) as string[];
		selectedProjectPaths.forEach(async selectedProjectPath => {
			// Filter the files by the selected project path and if exists any credential folder
			const filesByProject = files.filter(file => file.projectPath === selectedProjectPath);
			// Filter the files by the selected project path and if exists any credential folder
			const credentialFolders = filesByProject.filter(file => file.level === "cred_folder");
			// Filter the files by the selected project path and if exists any business unit folder
			const buFolders = filesByProject.filter(file => file.level === "bu_folder");

			if (credentialFolders.length) {
				const newFiles: TDevTools.IExecuteFileDetails[] = [];
				for (const credential of credentialFolders) {
					// Requests user to select a business unit to retrieve
					const selectedBU = (await this.selectBusinessUnits(selectedProjectPath, {
						multiBUs: false,
						credential: credential.credentialsName
					})) as string[];

					if (!selectedBU.length) continue;

					const businessUnitsPaths = selectedBU.map(
						businessUnit => `${credential.path}/${businessUnit.split("/")[1]}`
					);
					newFiles.push(...this.mcdev.convertPathsToFiles(businessUnitsPaths));
				}
				files = newFiles;
			} else if (buFolders.length) {
				// Requests yser to select the metadata types to retrieve
				const selectedMDTypes = (await this.selectMetaDataTypes("retrieve")) as string[];
				if (!selectedMDTypes.length) return;

				// creates an array of paths for each business unit folder and metadata types selected
				const mdTypesPaths = selectedMDTypes.flatMap(mdType =>
					buFolders.map(buFolder => `${buFolder.path}/${mdType}`)
				);
				files = this.mcdev.convertPathsToFiles(mdTypesPaths);
			}
			this.executeCommand("retrieve", { filesDetails: files });
		});
	}

	/**
	 * Selects business units based on the provided project path and options.
	 *
	 * @param {string} projectPath - The path to the project.
	 * @param {Object} options - The options for selecting business units.
	 * @param {boolean} options.multiBUs - Indicates if multiple business units can be selected.
	 * @returns {Promise<string[] | undefined>} A promise that resolves to an array of selected business units or undefined.
	 * @throws {Error} If no credentials or business units are found.
	 */
	async selectBusinessUnits(
		projectPath: string,
		{ multiBUs, credential }: { multiBUs: boolean; credential?: string }
	): Promise<string[] | undefined> {
		// Get the credentials and business units from the mcdevrc file
		const projectCredsConfig = this.mcdev.retrieveProjectCredentialsConfig(projectPath);
		// Get the credentials from the mcdevrc file
		const credentials = projectCredsConfig.getAllCredentials();
		let selectedCred: string | undefined;
		let selectedBUs: string[] | undefined;
		let errorMessage = "";

		// Skip credential selection if a credential is provided
		if (credential && credentials.includes(credential)) selectedCred = credential;
		// Skip user selection if only one credential is found
		else if (credentials.length === 1) selectedCred = credentials[0];
		// Request user to select a credential if multiple credentials are found
		else if (credentials.length > 1)
			// Request user to select a credential
			selectedCred = (await this.requestInputWithOptions(credentials, MessagesEditor.credentialPrompt, false)) as
				| string
				| undefined;
		else {
			// Show error message if no credentials are found in the mcdevrc file
			errorMessage = MessagesEditor.noCredentialFound;
		}

		// If a credential is selected, request user to select a business unit
		if (selectedCred) {
			// Get the business units associated with the selected credential
			const businessUnits = projectCredsConfig.getBusinessUnitsByCredential(selectedCred);
			// Skip user selection if only one business unit is found
			if (businessUnits.length === 1) selectedBUs = [businessUnits[0]];
			else if (businessUnits.length > 1) {
				// Request user to select a business unit
				selectedBUs = (await this.requestInputWithOptions(
					businessUnits,
					MessagesEditor.businessUnitsPrompt,
					multiBUs
				)) as string[] | undefined;
			} else {
				// Show error message if no business units are found for the selected credential
				errorMessage = MessagesEditor.noBusinessUnitsFound(selectedCred);
			}
		}

		// Return the selected business units
		if (selectedCred && selectedBUs) return [selectedBUs].flat().map(bu => `${selectedCred}/${bu}`);
		// Show error message if no credential or business units are found
		if (errorMessage) {
			this.writeLog(this.mcdev.getPackageName(), errorMessage, EnumsExtension.LoggerLevel.WARN);
			const openConfigFile = await this.showInformationMessage("error", errorMessage, ["Open config file"]);
			// Open the mcdevrc file in the editor
			if (openConfigFile) this.openFileInEditor(`${this.mcdev.getConfigFilePath(projectPath)}`);
			throw new Error(errorMessage);
		}
		return [];
	}

	async selectMetaDataTypes(action: string) {
		try {
			const metadataTypes = this.mcdev.retrieveSupportedMetadataDataTypes(action);
			const metadataTypesNames = metadataTypes.map(mdTypes => mdTypes.name).sort();
			const selectedMDTypes = (await this.requestInputWithOptions(
				metadataTypesNames,
				MessagesEditor.metaDataTypePrompt,
				true
			)) as string | undefined;
			if (selectedMDTypes)
				return metadataTypes
					.filter(mdType => selectedMDTypes.includes(mdType.name))
					.map(mdType => mdType.apiName);
			return [];
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.WARN);
			return;
		}
	}

	/**
	 * Generates a status bar title string with an icon and name.
	 *
	 * @param iconName - The name of the icon to be displayed in the status bar.
	 * @param name - The name to be displayed next to the icon in the status bar.
	 * @returns The formatted status bar title string.
	 */
	getStatusBarTitle(iconName: string, name: string): string {
		// Get the status bar icon based on the icon name
		const statusBarIcon = EnumsExtension.StatusBarIcon[iconName as keyof typeof EnumsExtension.StatusBarIcon];
		return `$(${statusBarIcon}) ${name}`;
	}

	/**
	 * Updates the status bar with the specified name, title, and color.
	 *
	 * @param name - The name of the status bar item to update.
	 * @param title - The text to display in the status bar.
	 * @param color - The background color of the status bar item.
	 * @returns void
	 */
	updateStatusBar(name: string, title: string, color: string): void {
		this.updateContainers(name, { text: title, backgroundColor: color });
	}

	/**
	 * Executes a given command with specified parameters and updates the status bar and logs accordingly.
	 *
	 * @param {string} command - The command to be executed.
	 * @param {TDevTools.IExecuteParameters} executeParameters - The parameters required for command execution.
	 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating the success of the command execution.
	 *
	 */
	executeCommand(command: string, executeParameters: TDevTools.IExecuteParameters): Promise<boolean> {
		console.log("== Execute Menu Commands == ");
		// Gets the package name from the mcdev instance
		const packageName = this.mcdev.getPackageName();
		// Sets the status bar title and icon based on the command execution
		const initialStatusBarTitle = this.getStatusBarTitle(command, packageName);
		const inProgressBarTitle = MessagesEditor.runningCommand;

		/**
		 * Executes logging based on the provided output information.
		 *
		 * @param {Object} param - The output logger object.
		 * @param {string} [param.info=""] - Informational message to log.
		 * @param {string} [param.output=""] - Output message to log.
		 * @param {string} [param.error=""] - Error message to log.
		 *
		 */
		const executeOnOutput = ({ info = "", output = "", error = "" }: TUtils.IOutputLogger) => {
			const message = info || output || error;
			// Sets the logger level according to the output received
			let loggerLevel = EnumsExtension.LoggerLevel.DEBUG;
			if (info) loggerLevel = EnumsExtension.LoggerLevel.INFO;
			if (output) loggerLevel = EnumsExtension.LoggerLevel.OUTPUT;
			if (error) loggerLevel = EnumsExtension.LoggerLevel.WARN;

			this.writeLog(packageName, message, loggerLevel);
		};

		/**
		 * Executes actions based on the result of a command.
		 *
		 * @param success - A boolean indicating whether the command was successful.
		 * @param resolveCommand - A function to resolve the command with a boolean value.
		 *
		 * @returns A promise that resolves when the actions are completed.
		 *
		 */
		const executeOnResult = async (success: boolean, resolveCommand: (value: boolean) => void) => {
			const statusBarIcon = success ? "success" : "error";
			// changes the status bar icon and and color according to the execution result of the command
			const newStatusBarColor = success ? "" : "error";
			const newStatusBarTitle = this.getStatusBarTitle(statusBarIcon, packageName);

			// Sets the message to show in the modal depending on the execution result
			const infoMessage = success ? MessagesEditor.runningCommandSuccess : MessagesEditor.runningCommandFailure;

			// Options to be displayed in the modal message
			const infoMessageOptions = ["More Details"];
			this.updateStatusBar(packageName, newStatusBarTitle, newStatusBarColor);

			if (!success)
				// Changes back the status bar icon and backaground color to inital configuration after some time
				Lib.executeAfterDelay(
					() => this.updateStatusBar(packageName, this.getStatusBarTitle("success", packageName), ""),
					ConfigExtension.delayTimeUpdateStatusBar
				);

			resolveCommand(success);

			// Shows the modal message with the result of the command execution
			const moreDetails = await this.showInformationMessage(
				success ? "info" : "error",
				infoMessage,
				infoMessageOptions
			);
			// if user clicks on 'More Details' button it will open the output channel
			if (moreDetails) this.showOuputChannel(packageName);
		};

		// Updates the status bar with the initial configuration
		this.updateStatusBar(packageName, initialStatusBarTitle, "");

		// Execute the commands asynchronously
		return new Promise(async resolveCommand => {
			this.activateNotificationProgressBar(
				inProgressBarTitle,
				false,
				() =>
					new Promise(async resolveExecute => {
						const { success }: { success: boolean } = await this.mcdev.execute(
							command,
							executeOnOutput,
							executeParameters
						);
						executeOnResult(success, resolveCommand);
						resolveExecute(success);
					})
			);
		});
	}
}
export default DevToolsExtension;
