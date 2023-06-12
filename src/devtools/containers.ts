import { containersConfig } from "../config/containers.config";
import { devtoolsMain } from "./main";
import { ExtensionContext, editorContext } from "../editor/context";
import { StatusBarItem, editorContainers } from "../editor/containers";
import { editorCommands } from "../editor/commands";
import { log } from "../editor/output";
    
// Contains all the status bars that are displayed in the extension
let statusBarContainer: StatusBarItem | StatusBarItem[];

function activateStatusBar(isDevtoolsProject: boolean, commandPrefix: string): void {
    log("info", "Activating Status Bar Options...");
    const { subscriptions }: ExtensionContext = editorContext.get();

    // Gets the command prefix for
    let statusBarCommand: string | string[];

    // Check which status bar should be displayed
    // if .mcdevrc.json AND .mcdev-auth.json in folder then mcdev:Credential/BU && mcdev:Command
    // else mcdev: Initialize
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
}

function modifyStatusBar(statusBarId: string, commandPrefix: string, statusBarText: string): void {
    if(statusBarContainer && Array.isArray(statusBarContainer)){
        const [ statusBar ] = statusBarContainer.filter(
            (sb: StatusBarItem) => sb.name === `devtools${statusBarId}`
        );
        if(statusBar){
            statusBar.text = `${commandPrefix}: ${statusBarText}`;
        }
    }
}

function isCredentialBUSelected(): boolean {
    return statusBarContainer &&
        Array.isArray(statusBarContainer) &&
        statusBarContainer.filter(
            (sb: StatusBarItem) => 
            sb.name === containersConfig.statusBarDevToolsCredentialBUName && 
            !sb.text.includes(`${containersConfig.statusBarDevToolsCredentialBUTitle}`)
        ).length > 0;
}

function getCredentialsBUName(): string | undefined {
    if(statusBarContainer && Array.isArray(statusBarContainer)){
        const [ statusBar ] = statusBarContainer.filter(
            (sb: StatusBarItem) => 
            sb.name === containersConfig.statusBarDevToolsCredentialBUName && 
            !sb.text.includes(`${containersConfig.statusBarDevToolsCredentialBUTitle}`)
        );
        return statusBar.text;
    }
    return;
}

function activateContextMenuCommands(){
    [
        containersConfig.contextMenuRetrieveCommand, 
        containersConfig.contextMenuDeployCommand
    ].forEach((command: string) => editorCommands.registerCommand({
        command,
        callbackAction: () => {
            const [ _, key ]: string[] = command.split(".devtools");
            return devtoolsMain.handleContextMenuActions(key);
        }
    }));
}

export const devtoolsContainers = {
    activateStatusBar,
    modifyStatusBar,
    isCredentialBUSelected,
    getCredentialsBUName,
    activateContextMenuCommands
};