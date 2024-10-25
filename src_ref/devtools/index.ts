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

	async init() {
		console.log("== Init ==");
		// Checks if is there any DevTools Project
		const isDevToolsProject: boolean = await this.isDevToolsProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	async isDevToolsProject(): Promise<boolean> {
		console.log("== Is Project ==");
		const requiredProjectFiles: string[] = ConfigDevTools.requiredFiles || [];
		// Checks if the required DevTools files exist in the folder/folders
		const filesInFolderResult: boolean[] = await Promise.all(
			requiredProjectFiles.map(
				async (file: string) => await this.vscodeEditor.getWorkspace().isFileInWorkspaceFolder(`**/${file}`)
			)
		);
		return filesInFolderResult.every((fileResult: boolean) => fileResult);
	}

	async loadConfiguration() {
		console.log("== Load Configuration ==");

		// Check if Mcdev is installed
		const mcdevInstalled: boolean = this.mcdev.isInstalled();
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
	}

	async mcdevInstall() {
		console.log("== Install Mcdev ==");
		const vscodeCommands: TEditor.VSCodeCommands = this.vscodeEditor.getCommands();

		// Asks user if he wishes to install mcdev
		const userAnswer: string | undefined = await this.showInformationMessage(
			MessagesDevTools.noMcdevInstalled,
			Object.keys(EnumsExtension.Confirmation)
		);

		const handleInstallResult = async (success: boolean): Promise<void> => {
			// if mcdev was successfully installed -> reloads vscode editor window
			if (success) {
				const reload: string | undefined = await this.showInformationMessage(
					MessagesDevTools.mcdevInstallSuccess,
					["Reload Window"]
				);
				if (reload) vscodeCommands.reloadWorkspace();
			} else this.showInformationMessage(MessagesDevTools.mcdevInstallError, []);
		};

		if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.Confirmation.Yes) {
			// Shows loading notification
			this.activateNotificationProgressBar(
				MessagesDevTools.mcdevInstallLoading,
				false,
				() =>
					new Promise(resolve => {
						const { success }: { success: boolean } = this.mcdev.install();
						handleInstallResult(success);
						resolve(success);
					})
			);
		}
	}

	activateContextVariables() {
		console.log("== Activate Context Variables ==");
		const vscodeCommands: TEditor.VSCodeCommands = this.vscodeEditor.getCommands();
		vscodeCommands.executeCommandContext(`${ConfigDevTools.extensionName}.config.isproject`, [true]);
	}

	async activateRecommendedExtensions() {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWorkspace: TEditor.VSCodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions: TEditor.VSCodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands: TEditor.VSCodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions: string[] = ConfigDevTools.recommendedExtensions;
		const configurationKey: string = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions: string[] = recommendedExtensions.filter(
			(extension: string) => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions: boolean = vscodeWorkspace.isConfigurationKeyEnabled(
			ConfigDevTools.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer: string | undefined = await this.showInformationMessage(
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
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands: TEditor.VSCodeCommands = this.vscodeEditor.getCommands();

		if (!this.mcdev.getPackageName()) throw new Error("");

		const statusBarCommand: string = `${ConfigDevTools.extensionName}.openOutputChannel`;
		const statusBarTitle: string = `$(${EnumsExtension.StatusBarIcon.success}) ${this.mcdev.getPackageName()}`;
		const packageName: string = this.mcdev.getPackageName();

		vscodeCommands.registerCommand({
			command: statusBarCommand,
			callbackAction: () => vscodeWindow.displayOutputChannel(packageName)
		});

		vscodeWindow.createStatusBarItem(statusBarCommand, statusBarTitle, packageName);
		vscodeWindow.displayStatusBarItem(packageName);
	}

	async writeExtensionInformation() {
		const packageName: string = this.mcdev.getPackageName();
		const context: TEditor.VSCodeContext = this.vscodeEditor.getContext();
		const workspace: TEditor.VSCodeWorkspace = this.vscodeEditor.getWorkspace();

		const [mcdevrcFile]: string[] = ConfigDevTools.requiredFiles;
		const mcdevrcFsPath: string[] = await workspace.findWorkspaceFiles(`**/${mcdevrcFile}`);
		const mcdevrcPathMessage: string[] = mcdevrcFsPath.map(
			(mcdevrcPath: string) => `${MessagesDevTools.mcdevConfigFile} ${mcdevrcPath}`
		);

		const messages: string[] = [
			`Extension name: ${context.getExtensionName()}`,
			`Extension version: ${context.getExtensionVersion()}`,
			...mcdevrcPathMessage
		];
		messages.forEach((message: string) => this.writeLog(packageName, message, EnumsExtension.LoggerLevel.INFO));
	}

	updateContainers(containerName: string, fields: { [key in TEditor.StatusBarFields]?: string }) {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.updateStatusBarItem(containerName, fields);
	}

	updateMetadataTypesFile() {
		const workspace: TEditor.VSCodeWorkspace = this.vscodeEditor.getWorkspace();
		const projectPath: string | undefined = workspace.getWorkspacePath();
		if (!projectPath) throw new Error("...");
		this.mcdev.updateMetadataTypes(projectPath);
	}

	async showInformationMessage(title: string, options: string[]): Promise<string | undefined> {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		const answer: string | undefined = await vscodeWindow.showInformationMessageWithOptions(title, options);
		return answer;
	}

	writeLog(ouputChannel: string, message: string, level: EnumsExtension.LoggerLevel) {
		const timestamp: string = Lib.getCurrentTime();
		if (level !== "debug") message = `${timestamp} ${level}: ${message}`;
		this.logTextOutputChannel(ouputChannel, message);
	}

	logTextOutputChannel(name: string, text: string) {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.appendTextToOutputChannel(name, text);
	}

	showOuputChannel(name: string) {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.displayOutputChannel(name);
	}

	getActiveTabFilePath(): string {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		return vscodeWindow.getEditorOpenedFilePath();
	}

	activateNotificationProgressBar(
		title: string,
		cancellable: boolean,
		progressBarHandler: TEditor.ProgressBarHandler
	) {
		const vscodeWindow: TEditor.VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.showProgressBar(title, "Notification", cancellable, progressBarHandler);
	}

	activateMenuCommands() {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands: TEditor.VSCodeCommands = this.vscodeEditor.getCommands();

		ConfigDevTools.menuCommands.forEach((command: string) =>
			vscodeCommands.registerCommand({
				command: `${ConfigDevTools.extensionName}.${command}`,
				callbackAction: (files: string[]) => {
					if (!files.length) files = [this.getActiveTabFilePath()];
					this.executeMenuCommands(command, files);
				}
			})
		);
	}

	executeMenuCommands(command: string, files: string[]) {
		console.log("== Execute Menu Commands ==");
		if (files.length > 0) {
			const packageName: string = this.mcdev.getPackageName();
			const initialStatusBarColor: string = "";
			const initialStatusBarTitle: string = `$(${EnumsExtension.StatusBarIcon[command as keyof typeof EnumsExtension.StatusBarIcon]}) ${packageName}`;
			const inProgressBarTitle: string = MessagesEditor.runningCommand;

			const mcdevExecuteOnOutput = ({ info = "", output = "", error = "" }: TUtils.IOutputLogger) => {
				const message: string = info || output || error;
				const loggerLevel = info
					? EnumsExtension.LoggerLevel.INFO
					: error
						? EnumsExtension.LoggerLevel.ERROR
						: EnumsExtension.LoggerLevel.DEBUG;
				this.writeLog(packageName, message, loggerLevel);
			};

			const mcdevExecuteOnResult = async (success: boolean) => {
				const statusBarIcon: string = success
					? EnumsExtension.StatusBarIcon.success
					: EnumsExtension.StatusBarIcon.error;
				const newStatusBarColor = success ? initialStatusBarColor : "error";
				const newStatusBarTitle = `$(${statusBarIcon}) ${packageName}`;

				this.updateContainers(packageName, { text: newStatusBarTitle, backgroundColor: newStatusBarColor });

				if (!success)
					Lib.executeAfterDelay(
						() =>
							this.updateContainers(packageName, {
								text: `$(${EnumsExtension.StatusBarIcon.success}) ${packageName}`,
								backgroundColor: initialStatusBarColor
							}),
						ConfigDevTools.delayTimeUpdateStatusBar
					);

				const moreDetails: string | undefined = await this.showInformationMessage(
					success ? MessagesEditor.runningCommandSuccess : MessagesEditor.runningCommandFailure,
					["More Details"]
				);
				if (moreDetails) this.showOuputChannel(packageName);
			};

			this.updateContainers(packageName, { text: initialStatusBarTitle, backgroundColor: initialStatusBarColor });
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
