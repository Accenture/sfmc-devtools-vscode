import { extensions } from "vscode";
import { editorWorkspace } from "./workspace";
import { editorInput } from "./input";
import { editorCommands } from "./commands";

enum RecommendedExtensionsInputOptions {
	INSTALL = "Install",
	NOT_NOW = "Not Now",
	DONT_ASK_AGAIN = "Do not show again"
}

async function activateExtensionDependencies(dependencies: string | string[]) {
	const missingExtDependencies: string[] = [dependencies]
		.flat()
		.filter((dependencyName: string) => !extensions.getExtension(dependencyName));

	if (missingExtDependencies.length) {
		const workspaceConfiguration = editorWorkspace.handleWorkspaceConfiguration("sfmc-devtools-vscode", "Global");
		const suggestRecommendedExtensions: boolean = Boolean(workspaceConfiguration.get("recommendExtensions", true));

		if (suggestRecommendedExtensions) {
			const message: string =
				"There are some recommended extensions that can enhance your usage of SFMC DevTools. Would you like to install them?";
			const options: string[] = Object.values(RecommendedExtensionsInputOptions);
			const selectedOption: string | undefined = await editorInput.handleShowOptionsMessage(message, options);
			if (selectedOption) {
				if (selectedOption === RecommendedExtensionsInputOptions.INSTALL) {
					missingExtDependencies.forEach((extDependency: string) => {
						editorCommands.executeCommand(
							["extension.open", "workbench.extensions.installExtension"],
							[extDependency]
						);
					});
				} else if (selectedOption === RecommendedExtensionsInputOptions.DONT_ASK_AGAIN) {
					workspaceConfiguration.set("recommendExtensions", false);
				}
			}
		}
	}
}

function deactivateCompactFolders() {
	const workspaceConfiguration = editorWorkspace.handleWorkspaceConfiguration("explorer", "Workspace");
	const isCompactFoldersEnabled: boolean = Boolean(workspaceConfiguration.get("compactFolders", true));
	if (isCompactFoldersEnabled) {
		// Disable Compact Folders
		workspaceConfiguration.set("compactFolders", false);
	}
}

const editorDependencies = {
	activateExtensionDependencies,
	deactivateCompactFolders
};

export { editorDependencies };
