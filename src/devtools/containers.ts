import { ExtensionContext, editorContext } from "../editor/context";
import { StatusBarItem, editorContainers } from "../editor/containers";
import { editorCommands } from "../editor/commands";
import { containersConfig } from "../config/containers.config";
import { log } from "../editor/output";
import { devtoolsMain } from "./main";
    
// Contains all the status bars that are displayed in the extension
let statusBarContainer: StatusBarItem | StatusBarItem[];

function activateStatusBar(isDevtoolsProject: boolean){
    log("info", "Activating Status Bar Options...");
    const { subscriptions }: ExtensionContext = editorContext.get();
    
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
                    containersConfig.statusBarDevToolsCredentialBUTitle,
                    containersConfig.statusBarDevToolsCredentialBUName
                ),
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarDevToolsCommandCommand,
                    containersConfig.statusBarDevToolsCommandTitle,
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
                containersConfig.statusBarDevToolsInitializeTitle,
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
            const [ _, key ]: string[] = command.split(".mcdev");
            return devtoolsMain.handleStatusBarActions(key);
        }
    }));
}

function modifyStatusBar(statusBarId: string, statusBarText: string){
    console.log(typeof statusBarContainer);
    if(statusBarContainer && Array.isArray(statusBarContainer)){
        const [ statusBar ] = statusBarContainer.filter(
            (sb: StatusBarItem) => sb.name === `mcdev${statusBarId}`
        );
        if(statusBar){
            statusBar.text = `mcdev: ${statusBarText}`;
        }
    }
}

export const devtoolsContainers = {
    activateStatusBar,
    modifyStatusBar
};