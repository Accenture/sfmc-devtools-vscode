import { containersConfig } from "../config/containers.config";
import { devtoolsMain } from "./main";
import { ExtensionContext, editorContext } from "../editor/context";
import { StatusBarItem, editorContainers } from "../editor/containers";
import { Uri, editorCommands } from "../editor/commands";
import { editorWorkspace } from "../editor/workspace";
import { log } from "../editor/output";

enum StatusBarIcon {
	success = "check-all",
	retrieve = "cloud-download",
	deploy = "cloud-upload",
	error = "warning",
	copy_to_folder = "file-symlink-directory",
	info = "extensions-info-message"
}

// Contains all the status bars that are displayed in the extension
let statusBarContainer: StatusBarItem | StatusBarItem[];

function activateStatusBar(/*isDevtoolsProject: boolean, commandPrefix: string*/): void {
	log("debug", "Activating Status Bar Options...");
	const { subscriptions }: ExtensionContext = editorContext.get();

	// Gets the command prefix for
	let statusBarCommand: string | string[];

	statusBarContainer = editorContainers.displayStatusBarItem([
		editorContainers.createStatusBarItem(
			containersConfig.statusBarDevToolsCommand,
			`$(${StatusBarIcon.success}) ${containersConfig.statusBarDevToolsTitle}`,
			containersConfig.statusBarDevToolsName
		)
	]);

	statusBarCommand = [containersConfig.statusBarDevToolsCommand];

	subscriptions.push(...[statusBarContainer].flat());

	// Register the commands
	[statusBarCommand].flat().forEach((command: string) =>
		editorCommands.registerCommand({
			command,
			callbackAction: () => {
				const [_, key]: string[] = command.split(".devtools");
				return devtoolsMain.handleStatusBarActions(key);
			}
		})
	);

	// Check which status bar should be displayed
	// if .mcdevrc.json AND .mcdev-auth.json in folder then mcdev:Credential/BU && mcdev:Command
	// else mcdev: Initialize
	/*
    if(isDevtoolsProject){

        // Status Bar mcdev: initialize must be removed if the user initialized devtools in a folder.
        // mcdev: initialize should only be shown when the folder is not a DevTools Project
        // subscriptions is a const var
        if(subscriptions.length){
            subscriptions.forEach((sb: {dispose: () => void}) => sb.dispose());
        }

        // create status bar with mcdev: Credential/BU and mcdev: Command
        statusBarContainer = editorContainers.displayStatusBarItem(
            [ 
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarDevToolsCredentialBUCommand,
                    `${commandPrefix}: ${containersConfig.statusBarDevToolsCredentialBUTitle}`,
                    containersConfig.statusBarDevToolsCredentialBUName
                ),
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarDevToolsCommandCommand,
                    `${commandPrefix}: ${containersConfig.statusBarDevToolsCommandTitle}`,
                    containersConfig.statusBarDevToolsCommandName
                )
            ]
        );
        statusBarCommand = [
            containersConfig.statusBarDevToolsCredentialBUCommand,
            containersConfig.statusBarDevToolsCommandCommand
        ];
        log("debug", 
            `StatusBar: [${
                [
                    containersConfig.statusBarDevToolsCredentialBUTitle, 
                    containersConfig.statusBarDevToolsCommandTitle
                ]
            }]`
        );
    }else{
        // create status bar with mcdev: Initialize
        statusBarContainer = editorContainers.displayStatusBarItem(
            editorContainers.createStatusBarItem(
                containersConfig.statusBarDevToolsInitializeCommand,
                `${commandPrefix}: ${containersConfig.statusBarDevToolsInitializeTitle}`,
                containersConfig.statusBarDevToolsInitializeName
            )
        );
        statusBarCommand = containersConfig.statusBarDevToolsInitializeCommand;
        log("debug", 
            `StatusBar: [${[containersConfig.statusBarDevToolsInitializeTitle]}]`
        );
    }
    // adds the Status Bar Items to be displayed
    subscriptions.push(...[statusBarContainer].flat());
        
    // Register the commands
    [statusBarCommand].flat().forEach((command: string) => editorCommands.registerCommand({
        command,
        callbackAction: () => {
            const [ _, key ]: string[] = command.split(".devtools");
            return devtoolsMain.handleStatusBarActions(key);
        }
    }));

    */
}

function modifyStatusBar(statusBarId: string, action: keyof typeof StatusBarIcon): void {
	if (statusBarContainer && Array.isArray(statusBarContainer)) {
		const [statusBar] = statusBarContainer.filter(
			(sb: StatusBarItem) => sb.name?.toLowerCase() === `${statusBarId.toLowerCase()}`
		);

		if (statusBar) {
			statusBar.text = `$(${StatusBarIcon[action]}) ${containersConfig.statusBarDevToolsTitle}`;
			statusBar.backgroundColor = editorContainers.getBackgroundColor(action === "error" ? "error" : "");
		}
	}
}

// function modifyStatusBar(statusBarId: string, commandPrefix: string, statusBarText: string): void {
//     if(statusBarContainer && Array.isArray(statusBarContainer)){
//         const [ statusBar ] = statusBarContainer.filter(
//             (sb: StatusBarItem) => sb.name === `devtools${statusBarId}`
//         );
//         if(statusBar){
//             statusBar.text = `${commandPrefix}: ${statusBarText}`;
//         }
//     }
// }

function isCredentialBUSelected(): boolean {
	return (
		statusBarContainer &&
		Array.isArray(statusBarContainer) &&
		statusBarContainer.filter(
			(sb: StatusBarItem) =>
				sb.name === containersConfig.statusBarDevToolsCredentialBUName &&
				!sb.text.includes(`${containersConfig.statusBarDevToolsCredentialBUTitle}`)
		).length > 0
	);
}

function getCredentialsBUName(commandPrefix: string): string | undefined {
	if (statusBarContainer && Array.isArray(statusBarContainer)) {
		const [{ text }] = statusBarContainer.filter(
			(sb: StatusBarItem) =>
				sb.name === containersConfig.statusBarDevToolsCredentialBUName &&
				!sb.text.includes(`${containersConfig.statusBarDevToolsCredentialBUTitle}`)
		);
		const [_, credentialbu] = text.split(`${commandPrefix}:`);
		return credentialbu.trim();
	}
	return;
}

function activateContextMenuCommands() {
	[
		containersConfig.contextMenuRetrieveCommand,
		containersConfig.contextMenuDeployCommand,
		containersConfig.contextMenuCopyToBUCommand
	].forEach((command: string) =>
		editorCommands.registerCommand({
			command,
			callbackAction: (file: Uri, multipleFiles: Uri[]) => {
				let filesURI: Uri[] = [];

				// Gets the file uri that is currently open in the editor
				const fileURI: Uri | undefined = editorContainers.getActiveTabFileURI();

				// If file is undefined it could be that the command is being called from the commands palette
				// else it should be the menu command
				if (!file && fileURI) {
					filesURI.push(fileURI);
				} else {
					filesURI = !Array.isArray(multipleFiles) ? [file] : multipleFiles;
				}

				if (filesURI.length) {
					// Gets the file path from the URI
					const filesPath: string[] = editorWorkspace.getFilesURIPath(filesURI);
					const [__, key]: string[] = command.split(".devtools");
					// Executes the command
					return devtoolsMain.handleContextMenuActions(key, filesPath);
				}
			}
		})
	);
}

const devtoolsContainers = {
	activateStatusBar,
	modifyStatusBar,
	isCredentialBUSelected,
	getCredentialsBUName,
	activateContextMenuCommands
};

export { StatusBarIcon, devtoolsContainers };
