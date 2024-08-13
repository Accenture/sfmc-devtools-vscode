import Mcdev from "./mcdev";
import VSCodeEditor from "../editor/index";
import VSCodeWindow from "../editor/window";
import VSCodeCommands from "../editor/commands";
import VSCodeExtensions from "../editor/extensions";
import VSCodeWorkspace from "../editor/workspace";
import { devToolsMessages } from "../messages/devtools.messages";
import { IDevTools, IEditor } from "@types";
import { devToolsConfig } from "@config";
import { Confirmation, RecommendedExtensionsOptions, StatusBarIcon } from "@constants";

class DevToolsExtension {
	private vscodeEditor: VSCodeEditor;
	private mcdev: Mcdev;
	constructor(context: IEditor.IExtensionContext) {
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
		const requiredProjectFiles: string[] = devToolsConfig.requiredFiles || [];
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
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();
		// Asks user if he wishes to install mcdev
		const userAnswer: string | undefined = await vscodeWindow.showInformationMessageWithOptions(
			devToolsMessages.noMcdevInstalled,
			Object.keys(Confirmation)
		);
		if (userAnswer && userAnswer.toLowerCase() === Confirmation.Yes) {
			// Shows loading notification
			await vscodeWindow.showInProgressMessage("Notification", devToolsMessages.mcdevInstallLoading, async () => {
				const { success }: { success: boolean } = this.mcdev.install();
				// if mcdev was successfully installed -> reloads vscode editor window
				if (success) {
					const reload: string | undefined = await vscodeWindow.showInformationMessageWithOptions(
						devToolsMessages.mcdevInstallSuccess,
						["Reload Window"]
					);
					if (reload) vscodeCommands.reloadWorkspace();
				} else vscodeWindow.showInformationMessageWithOptions(devToolsMessages.mcdevInstallError, []);
			});
		}
	}

	activateContextVariables() {
		console.log("== Activate Context Variables ==");
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();
		vscodeCommands.executeCommandContext(`${devToolsConfig.extensionName}.config.isproject`, [true]);
	}

	async activateRecommendedExtensions() {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		const vscodeWorkspace: VSCodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions: VSCodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions: string[] = devToolsConfig.recommendedExtensions;
		const configurationKey: string = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions: string[] = recommendedExtensions.filter(
			(extension: string) => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions: boolean = vscodeWorkspace.isConfigurationKeyEnabled(
			devToolsConfig.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer: string | undefined = await vscodeWindow.showInformationMessageWithOptions(
				devToolsMessages.recommendeExtensions,
				Object.keys(RecommendedExtensionsOptions)
			);

			// if user clicks on "do not show again" then recommendExtension disabled
			if (userAnswer && userAnswer.toLowerCase() === RecommendedExtensionsOptions["Do not show again"])
				vscodeWorkspace.setConfigurationKey(devToolsConfig.extensionName, configurationKey, false);
			// if user clicks on "install" then installs extensions
			if (userAnswer && userAnswer.toLowerCase() === RecommendedExtensionsOptions.Install)
				vscodeCommands.installExtension(uninstalledExtensions);
		}
	}

	activateContainers() {
		console.log("== Activate Containers ==");
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();

		const statusBarCommand: string = `${devToolsConfig.extensionName}.openOutputChannel`;
		const statusBarTitle: string = `$(${StatusBarIcon.success}) mcdev`;
		const statusBarName: string = `mcdev`;

		vscodeCommands.registerCommand({
			command: statusBarCommand,
			callbackAction: () => vscodeWindow.displayOutputChannel(statusBarName)
		});
		vscodeWindow.createStatusBarItem(statusBarCommand, statusBarTitle, statusBarName);
		vscodeWindow.displayStatusBarItem(statusBarName);
	}

	activateMenuCommands() {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands: VSCodeCommands = this.vscodeEditor.getCommands();

		devToolsConfig.menuCommands.forEach((command: string) =>
			vscodeCommands.registerCommand({
				command: `${devToolsConfig.extensionName}.${command}`,
				callbackAction: (files: string[]) => this.executeMenuCommands(command, files)
			})
		);
	}

	executeMenuCommands(command: string, files: string[]) {
		console.log("== Execute Menu Commands ==");
		console.log(command);
		const filesFormatted: IDevTools.IFileFormat[] = this.mcdev.convertFilePaths(files);

		if (filesFormatted.length > 0) {
			const isTopFolder: boolean =
				filesFormatted.filter((files: IDevTools.IFileFormat) => files.level === "top_folder").length > 1;

			const isCredentialsFolder: boolean =
				filesFormatted.filter((files: IDevTools.IFileFormat) => files.level === "cred_folder").length > 1;

			const isBUFolder: boolean =
				filesFormatted.filter((files: IDevTools.IFileFormat) => files.level === "bu_folder").length > 1;

			if (isTopFolder) {
				// show option to select credential name
			}

			// change mcdev status bar icon
			// running popup
			// execute command
			// change mcdev status bar icon
			// show conclusion popup
		}
	}
}
export default DevToolsExtension;
