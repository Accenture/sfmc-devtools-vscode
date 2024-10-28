import Mcdev from "./mcdev";
import { ConfigDevTools } from "@config";
import { MessagesDevTools, MessagesEditor } from "@messages";
import { EnumsExtension } from "@enums";
import { TEditor, TUtils } from "@types";
import { Lib } from "utils";

class DevToolsExtension {
	private vscodeEditor: TEditor.VSCodeEditor;
	private mcdev: Mcdev;

	constructor(context: TEditor.IExtensionContext) {
		this.vscodeEditor = new TEditor.VSCodeEditor(context);
		this.mcdev = new Mcdev();
	}

	async init(): Promise<void> {
		console.log("== Init ==");
		// Checks if is there any DevTools Project
		const isDevToolsProject = await this.isDevToolsProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	async isDevToolsProject(): Promise<boolean> {
		console.log("== Is Project ==");
		const requiredProjectFiles = ConfigDevTools.requiredFiles || [];
		// Checks if the required DevTools files exist in the folder/folders
		const filesInFolderResult = await Promise.all(
			requiredProjectFiles.map(
				async file => await this.vscodeEditor.getWorkspace().isFileInWorkspaceFolder(`**/${file}`)
			)
		);
		return filesInFolderResult.every(fileResult => fileResult);
	}

	async loadConfiguration() {
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
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.DEBUG);
		}
	}

	async mcdevInstall() {
		console.log("== Install Mcdev ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		// Asks user if he wishes to install mcdev
		const userAnswer = await this.showInformationMessage(
			MessagesDevTools.noMcdevInstalled,
			Object.keys(EnumsExtension.Confirmation)
		);

		const handleInstallResult = async (success: boolean, error: string): Promise<void> => {
			// if mcdev was successfully installed -> reloads vscode editor window
			// else shows information error message
			if (success) {
				const reload = await this.showInformationMessage(MessagesDevTools.mcdevInstallSuccess, [
					"Reload Window"
				]);
				if (reload) vscodeCommands.reloadWorkspace();
			} else {
				this.showInformationMessage(MessagesDevTools.mcdevInstallError, []);
				if (error) this.writeLog(this.mcdev.getPackageName(), error, EnumsExtension.LoggerLevel.DEBUG);
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

	activateContextVariables() {
		console.log("== Activate Context Variables ==");
		const vscodeCommands = this.vscodeEditor.getCommands();
		// Sets vscode environment variable 'isproject' to true
		vscodeCommands.executeCommandContext(`${ConfigDevTools.extensionName}.config.isproject`, [true]);
	}

	async activateRecommendedExtensions() {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions = ConfigDevTools.recommendedExtensions;
		const configurationKey = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions = recommendedExtensions.filter(
			extension => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions = vscodeWorkspace.isConfigurationKeyEnabled(
			ConfigDevTools.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer = await this.showInformationMessage(
				MessagesEditor.recommendedExtensions,
				Object.keys(EnumsExtension.RecommendedExtensionsOptions)
			);

			// if user clicks on "do not show again" then recommendExtension disabled
			if (
				userAnswer &&
				userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions["Do not show again"]
			)
				vscodeWorkspace.setConfigurationKey(ConfigDevTools.extensionName, configurationKey, false);
			// if user clicks on "install" then installs extensions
			if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions.Install)
				vscodeCommands.installExtension(uninstalledExtensions);
		}
	}

	activateContainers() {
		console.log("== Activate Containers ==");
		const vscodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const packageName = this.mcdev.getPackageName();

		// Sets the command when the status bar is clicked
		const statusBarCommand = `${ConfigDevTools.extensionName}.openOutputChannel`;
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

	async writeExtensionInformation() {
		const context = this.vscodeEditor.getContext();
		const workspace = this.vscodeEditor.getWorkspace();
		const packageName = this.mcdev.getPackageName();

		// Gets the .mcdevrc file name from the required DevTools file list
		const [mcdevrcFile] = ConfigDevTools.requiredFiles;
		// For every devtools project folder in the open workspace it retrieves the complete path of the .mcdevrc file
		const mcdevrcFsPath = await workspace.findWorkspaceFiles(`**/${mcdevrcFile}`);
		// Builds the message to be displayed with the .mcdevrc file path
		const mcdevrcPathMessage = mcdevrcFsPath.map(
			mcdevrcPath => `${MessagesDevTools.mcdevConfigFile} ${mcdevrcPath}`
		);

		const messages = [
			`Extension name: ${context.getExtensionName()}`,
			`Extension version: ${context.getExtensionVersion()}`,
			...mcdevrcPathMessage
		];
		// Prints the messages to the Output channel
		messages.forEach(message => this.writeLog(packageName, message, EnumsExtension.LoggerLevel.INFO));
	}

	updateContainers(containerName: string, fields: { [key in TEditor.StatusBarFields]?: string }) {
		const vscodeWindow = this.vscodeEditor.getWindow();
		// Updates the status bar container
		vscodeWindow.updateStatusBarItem(containerName, fields);
	}

	updateMetadataTypesFile() {
		const workspace = this.vscodeEditor.getWorkspace();
		const projectPath = workspace.getWorkspacePath();
		if (!projectPath) throw new Error("...");
		this.mcdev.updateMetadataTypes(projectPath);
	}

	async showInformationMessage(title: string, options: string[]): Promise<string | undefined> {
		const vscodeWindow = this.vscodeEditor.getWindow();
		const answer = await vscodeWindow.showInformationMessageWithOptions(title, options);
		return answer;
	}

	writeLog(ouputChannel: string, message: string, level: EnumsExtension.LoggerLevel) {
		const timestamp = Lib.getCurrentTime();
		if (level !== "debug") {
			// for output channel message should be in format 'timestamp level: message'
			message = `${timestamp} ${level}: ${message}`;
			this.logTextOutputChannel(ouputChannel, message);
		} else console.error(`${level}: ${message}`);
	}

	logTextOutputChannel(name: string, text: string) {
		const vscodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.appendTextToOutputChannel(name, text);
	}

	showOuputChannel(name: string) {
		const vscodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.displayOutputChannel(name);
	}

	getActiveTabFilePath(): string {
		const vscodeWindow = this.vscodeEditor.getWindow();
		return vscodeWindow.getEditorOpenedFilePath();
	}

	activateNotificationProgressBar(
		title: string,
		cancellable: boolean,
		progressBarHandler: TEditor.ProgressBarHandler
	) {
		const vscodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.showProgressBar(title, "Notification", cancellable, progressBarHandler);
	}

	activateMenuCommands() {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		ConfigDevTools.menuCommands.forEach(command =>
			// For all the menu commands configured it will register the command and execution action
			vscodeCommands.registerCommand({
				command: `${ConfigDevTools.extensionName}.${command}`,
				callbackAction: (files: string[]) => {
					// When the menu command is done from the file tab it requires the active open file path
					if (!files.length) files = [this.getActiveTabFilePath()];
					this.executeMenuCommands(command, files);
				}
			})
		);
	}

	executeMenuCommands(command: string, files: string[]) {
		console.log("== Execute Menu Commands ==");
		if (files.length > 0) {
			const packageName = this.mcdev.getPackageName();
			// inital running command status bar configuration
			const initialStatusBarColor = "";
			const initialStatusBarIcon: string =
				EnumsExtension.StatusBarIcon[command as keyof typeof EnumsExtension.StatusBarIcon];
			const initialStatusBarTitle = `$(${initialStatusBarIcon}) ${packageName}`;
			const inProgressBarTitle = MessagesEditor.runningCommand;

			const mcdevExecuteOnOutput = ({ info = "", output = "", error = "" }: TUtils.IOutputLogger) => {
				const message = info || output || error;
				const loggerLevel = info
					? EnumsExtension.LoggerLevel.INFO
					: error
						? EnumsExtension.LoggerLevel.ERROR
						: EnumsExtension.LoggerLevel.DEBUG;
				this.writeLog(packageName, message, loggerLevel);
			};

			const mcdevExecuteOnResult = async (success: boolean) => {
				const statusBarIcon = success
					? EnumsExtension.StatusBarIcon.success
					: EnumsExtension.StatusBarIcon.error;
				// changes the status bar icon and and color according to the execution result of the command
				const newStatusBarColor = success ? initialStatusBarColor : "error";
				const newStatusBarTitle = `$(${statusBarIcon}) ${packageName}`;

				this.updateContainers(packageName, { text: newStatusBarTitle, backgroundColor: newStatusBarColor });

				if (!success)
					// Changes back the status bar icon and backaground color to inital configuration after some time
					Lib.executeAfterDelay(
						() =>
							this.updateContainers(packageName, {
								text: `$(${EnumsExtension.StatusBarIcon.success}) ${packageName}`,
								backgroundColor: initialStatusBarColor
							}),
						ConfigDevTools.delayTimeUpdateStatusBar
					);

				const moreDetails = await this.showInformationMessage(
					success ? MessagesEditor.runningCommandSuccess : MessagesEditor.runningCommandFailure,
					["More Details"]
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
							files
						);
						mcdevExecuteOnResult(success);
						resolve(success);
					})
			);
		}
	}
}
export default DevToolsExtension;
