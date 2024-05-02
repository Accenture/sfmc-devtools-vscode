import Editor from "../editor/index";
import DevToolsUtils from "./utils";
import mcdev from "mcdev";
import { devToolsConfig } from "../config/devtools.config";
import { IDevTools, IEditor } from "@types";

export default function () {
	let editor: IEditor.IInstance | null = null;
	let utils: IDevTools.IDevToolsUtils | null = null;

	async function loadConfiguration() {
		console.log("=== Index: Load Configuration ===");
		mcdev.retrieve("1234", ["dataextension"], ["1234"]);
	}

	async function checkConfiguration() {
		console.log("=== Index: Checking Configuration ===");
		if (utils) {
			const isDevToolsProject: boolean = await utils.isDevToolsProject(devToolsConfig.requiredFiles);
			// const isSubFolderADevToolsProject: boolean = utils.subFoldersAreDevToolsProject();
			if (isDevToolsProject) loadConfiguration();
		} else {
			// Throw Error
		}
	}

	function init(context: IEditor.IExtensionContext) {
		console.log("=== Index: Init ===");
		editor = Editor(context);
		utils = DevToolsUtils(editor);

		checkConfiguration();
	}

	return { init };
}
