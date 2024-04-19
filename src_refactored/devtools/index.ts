import { IDevTools, IEditor } from "../types";
import Editor from "../editor/index";
import DevToolsUtils from "./utils";
import { devToolsConfig } from "../config/devtools.config";

export default function () {
	let editor: IEditor.IInstance | null = null;
	let utils: IDevTools.IDevToolsUtils | null = null;

	async function loadConfiguration() {}
	async function checkConfiguration() {
		if (utils) {
			const isDevToolsProject: boolean = await utils.isDevToolsProject(devToolsConfig.requiredFiles);
			const isSubFolderADevToolsProject: boolean = utils.subFoldersAreDevToolsProject();
			if (isDevToolsProject) loadConfiguration();
		} else {
			// Throw Error
		}
	}

	function init(context: IEditor.IExtensionContext) {
		editor = Editor(context);
		utils = DevToolsUtils(editor);

		checkConfiguration();
	}

	return { init };
}
