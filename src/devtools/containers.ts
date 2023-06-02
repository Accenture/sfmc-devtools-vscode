import { ExtensionContext, editorContext } from "../editor/context";
import { StatusBarItem, editorContainers } from "../editor/containers";
import { editorCommands } from "../editor/commands";
import { containersConfig } from "../config/containers.config";
import { devtoolsMain } from "./main";

async function activate(){

    const { subscriptions }: ExtensionContext = editorContext.get();
    // Check which status bar should be displayed
    // if .mcdevrc.json AND .mcdev-auth.json in folder then DT:Credentials && DT:Command
    // else DT: Initialize
    const isDevtoolsProject: boolean = await devtoolsMain.isADevToolsProject();
    let statusBarContainer: StatusBarItem | StatusBarItem[];
    let statusBarCommand: string | string[];
    if(isDevtoolsProject){
        // create status bar with DT:Credentials and DT:Command
        statusBarContainer = editorContainers.displayStatusBarItem(
            [ 
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarDTCredentialBUCommand,
                    containersConfig.statusBarDTCredentialBUTitle
                ),
                editorContainers.createStatusBarItem(
                    containersConfig.statusBarDTCommandCommand,
                    containersConfig.statusBarDTCommandTitle
                )
            ]
        );
        statusBarCommand = [
            containersConfig.statusBarDTCredentialBUCommand,
            containersConfig.statusBarDTCommandCommand
        ];
    }else{
        // create status bar with DT: Initialize
        statusBarContainer = editorContainers.displayStatusBarItem(
            editorContainers.createStatusBarItem(
                containersConfig.statusBarDTInitializeCommand,
                containersConfig.statusBarDTInitializeTitle
            )
        );
        statusBarCommand = containersConfig.statusBarDTInitializeCommand;
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