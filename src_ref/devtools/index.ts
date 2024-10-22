/* eslint-disable @typescript-eslint/no-unused-vars */
import Mcdev from "./mcdev";
import VSCodeEditor from "../editor/index";
import VSCodeWindow from "../editor/window";
import VSCodeCommands from "../editor/commands";
import VSCodeExtensions from "../editor/extensions";
import VSCodeWorkspace from "../editor/workspace";
import { TEditor } from "@types";
import { CDevTools } from "@config";
import { MDevTools, MEditor } from "@messages";
import { Confirmation, RecommendedExtensionsOptions, StatusBarIcon } from "@constants";

class DevToolsExtension {
	private vscodeEditor: VSCodeEditor;
	private mcdev: Mcdev;

	constructor(context: TEditor.IExtensionContext) {
		this.vscodeEditor = new VSCodeEditor(context);
		this.mcdev = new Mcdev();
	}

	async init() {
		console.log("== Init ==");
		const isDevToolsProject: boolean = await this.isDevToolsProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	async isDevToolsProject(): Promise<boolean> {
		console.log("== Is Project ==");
		const requiredProjectFiles: string[] = CDevTools.requiredFiles || [];
		const filesInFolderResult: boolean[] = await Promise.all(
			requiredProjectFiles.map(
				async (file: string) => await this.vscodeEditor.getWorkspace().isFileInFolder(file)
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
		}
	}

	async mcdevInstall() {
		console.log("== Install Mcdev ==");
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();

		// Asks user if he wishes to install mcdev
		const userAnswer: string | undefined = await this.showInformationMessage(
			MDevTools.noMcdevInstalled,
			Object.keys(Confirmation)
		);

		const handleInstallResult = async (success: boolean): Promise<void> => {
			// if mcdev was successfully installed -> reloads vscode editor window
			if (success) {
				const reload: string | undefined = await this.showInformationMessage(MDevTools.mcdevInstallSuccess, [
					"Reload Window"
				]);
				if (reload) vscodeCommands.reloadWorkspace();
			} else this.showInformationMessage(MDevTools.mcdevInstallError, []);
		};

		if (userAnswer && userAnswer.toLowerCase() === Confirmation.Yes) {
			// Shows loading notification
			this.activateNotificationProgressBar(
				MDevTools.mcdevInstallLoading,
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
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();
		vscodeCommands.executeCommandContext(`${CDevTools.extensionName}.config.isproject`, [true]);
	}

	async activateRecommendedExtensions() {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWorkspace: VSCodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions: VSCodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions: string[] = CDevTools.recommendedExtensions;
		const configurationKey: string = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions: string[] = recommendedExtensions.filter(
			(extension: string) => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions: boolean = vscodeWorkspace.isConfigurationKeyEnabled(
			CDevTools.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer: string | undefined = await this.showInformationMessage(
				MEditor.recommendedExtensions,
				Object.keys(RecommendedExtensionsOptions)
			);

			// if user clicks on "do not show again" then recommendExtension disabled
			if (userAnswer && userAnswer.toLowerCase() === RecommendedExtensionsOptions["Do not show again"])
				vscodeWorkspace.setConfigurationKey(CDevTools.extensionName, configurationKey, false);
			// if user clicks on "install" then installs extensions
			if (userAnswer && userAnswer.toLowerCase() === RecommendedExtensionsOptions.Install)
				vscodeCommands.installExtension(uninstalledExtensions);
		}
	}

	activateContainers() {
		console.log("== Activate Containers ==");
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();

		if (!this.mcdev.getPackageName()) throw new Error("");

		const statusBarCommand: string = `${CDevTools.extensionName}.openOutputChannel`;
		const statusBarTitle: string = `$(${StatusBarIcon.success}) ${this.mcdev.getPackageName()}`;
		const packageName: string = this.mcdev.getPackageName();

		vscodeCommands.registerCommand({
			command: statusBarCommand,
			callbackAction: () => vscodeWindow.displayOutputChannel(packageName)
		});

		vscodeWindow.createStatusBarItem(statusBarCommand, statusBarTitle, packageName);
		vscodeWindow.displayStatusBarItem(packageName);
	}

	updateContainers(containerName: string, fields: { [key in TEditor.StatusBarFields]?: string }) {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.updateStatusBarItem(containerName, fields);
	}

	async showInformationMessage(title: string, options: string[]): Promise<string | undefined> {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		const answer: string | undefined = await vscodeWindow.showInformationMessageWithOptions(title, options);
		return answer;
	}

	logTextOutputChannel(name: string, text: string) {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.appendTextToOutputChannel(name, text);
	}

	showOuputChannel(name: string) {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.displayOutputChannel(name);
	}

	getActiveTabFilePath(): string {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		return vscodeWindow.getEditorOpenedFilePath();
	}

	activateNotificationProgressBar(
		title: string,
		cancellable: boolean,
		progressBarHandler: TEditor.ProgressBarHandler
	) {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.showProgressBar(title, "Notification", cancellable, progressBarHandler);
	}

	activateMenuCommands() {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();

		CDevTools.menuCommands.forEach((command: string) =>
			vscodeCommands.registerCommand({
				command: `${CDevTools.extensionName}.${command}`,
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
			let statusBarColor: string = "";
			let statusBarTitle: string = `$(${StatusBarIcon[command as keyof typeof StatusBarIcon]}) ${packageName}`;
			const inProgressBarTitle: string = MEditor.runningCommand;

			const mcdevExecuteOnOutput = (output: string, error: string) => {
				if (error) throw new Error("...");
				this.logTextOutputChannel(packageName, output);
			};

			const mcdevExecuteOnResult = async (success: boolean) => {
				const statusBarIcon: string = success ? StatusBarIcon.success : StatusBarIcon.error;
				statusBarColor = success ? statusBarColor : "error";
				statusBarTitle = `$(${statusBarIcon}) ${packageName}`;

				this.updateContainers(packageName, { text: statusBarTitle, backgroundColor: statusBarColor });

				const moreDetails: string | undefined = await this.showInformationMessage(
					success ? MEditor.runningCommandSuccess : MEditor.runningCommandFailure,
					["More Details"]
				);
				if (moreDetails) this.showOuputChannel(packageName);
			};

			this.updateContainers(packageName, { text: statusBarTitle });
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
