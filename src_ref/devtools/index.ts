import { devToolsConfig } from "../config/devtools.config";
import { IEditor } from "@types";
import VSCodeEditor from "../editor/index";
import Mcdev from "./mcdev";

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
		const isMcdevInstalled: boolean = this.mcdev.isInstalled();
		console.log("isMcdevInstalled ", isMcdevInstalled);
		// if no -> ask to install it
		// activate dependencies
		// activate editor containers
	}
}
export default DevTools;
