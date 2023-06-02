import { ExtensionContext, editorContext } from "../editor/context";
import { StatusBarItem, editorContainers } from "../editor/containers";
import { editorCommands } from "../editor/commands";
import { containersConfig } from "../config/containers.config";
import { log } from "../editor/output";

function activate(isDevtoolsProject: boolean){
    log("info", "Activating Status Bar Options...");
    const { subscriptions }: ExtensionContext = editorContext.get();
    // Check which status bar should be displayed
    // if .mcdevrc.json AND .mcdev-auth.json in folder then mcdev:Credential/BU && mcdev:Command
    // else mcdev: Initialize
    let statusBarContainer: StatusBarItem | StatusBarItem[];
    let statusBarCommand: string | string[];
    if(isDevtoolsProject){
        // create status bar with mcdev: Credential/BU and mcdev: Command
        statusBarContainer = editorContainers.displayStatusBarItem(
            [ 
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarMCDEVCredentialBUCommand,
                    containersConfig.statusBarMCDEVCredentialBUTitle
                ),
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarMCDEVCommandCommand,
                    containersConfig.statusBarMCDEVCommandTitle
                )
            ]
        );
        statusBarCommand = [
            containersConfig.statusBarMCDEVCredentialBUCommand,
            containersConfig.statusBarMCDEVCommandCommand
        ];
        log("debug", 
            `StatusBar: [${
                [containersConfig.statusBarMCDEVCredentialBUTitle, containersConfig.statusBarMCDEVCommandTitle]
            }]`
        );
    }else{
        // create status bar with mcdev: Initialize
        statusBarContainer = editorContainers.displayStatusBarItem(
            editorContainers.createStatusBarItem(
                containersConfig.statusBarMCDEVInitializeCommand,
                containersConfig.statusBarMCDEVInitializeTitle
            )
        );
        statusBarCommand = containersConfig.statusBarMCDEVInitializeCommand;
        log("debug", 
            `StatusBar: [${[containersConfig.statusBarMCDEVInitializeTitle]}]`
        );
    }
    // adds the Status Bar Items to be displayed
    subscriptions.push(...[statusBarContainer].flat());
    
    // Register the commands
    [statusBarCommand].flat().forEach(command => editorCommands.registerCommand({
        command,
        callbackAction: () => {}
    }));
}

export const devtoolsContainers = {
    activate
};