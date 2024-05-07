import VSCodeEditor from "../editor/index";
import Mcdev from "./mcdev";
import { devToolsConfig } from "../config/devtools.config";
import { devToolsMessages } from "../messages/devtools.messages";
import { IEditor } from "@types";
import { Confirmation } from "../constants/constants";
import VSCodeWindow from "../editor/window";

class DevTools {
	vscodeEditor: VSCodeEditor;
	mcdev: Mcdev;
	constructor(context: IEditor.IExtensionContext) {
		this.vscodeEditor = new VSCodeEditor(context);
		this.mcdev = new Mcdev();
	}

	async init() {
		const isDevToolsProject: boolean = await this.isProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	async isProject(): Promise<boolean> {
		const requiredProjectFiles: string[] = devToolsConfig.requiredFiles || [];
		const filesInFolderResult: boolean[] = await Promise.all(
			requiredProjectFiles.map(
				async (file: string) => await this.vscodeEditor.getWorkspace().isFileInFolder(file)
			)
		);
		return filesInFolderResult.every((fileResult: boolean) => fileResult);
	}

	async loadConfiguration() {
		// Check if Mcdev is installed
		const mcdevInstalled: boolean = this.mcdev.isInstalled();
		if (mcdevInstalled) {
			// request user to install mcdev
			this.installMcdev();
		}

		// activate dependencies
		// activate editor containers
	}

	async installMcdev() {
		const vscodeWindow: VSCodeWindow = this.vscodeEditor.getWindow();
		// Asks user if he wishes to install mcdev
		const userAnswer: string | undefined = await vscodeWindow.showInformationMessageWithOptions(
			devToolsMessages.noMcdevInstalled,
			Object.keys(Confirmation).filter(v => isNaN(Number(v)))
		);
		if (userAnswer && userAnswer.toLowerCase() === Confirmation.Yes)
			await vscodeWindow.showInProgressMessage("Notification", progress => {
				progress.report({ message: devToolsMessages.mcdevInstallLoading });
				return new Promise<void>(resolve => {
					const installResult: { success: boolean } = this.mcdev.install();
					console.log(installResult);
					if (installResult.success)
						const response = vscodeWindow.showInformationMessageWithOptions(devToolsMessages.mcdevInstallSuccess, [
							"Reload Windows"
						]);
					resolve();
				});
			});
	}
}
export default DevTools;
