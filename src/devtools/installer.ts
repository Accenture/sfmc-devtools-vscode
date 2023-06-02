import { InstallDevToolsResponseOptions, installerConfig } from "../config/installer.config";
import { editorWorkspace } from "../editor/workspace";
import { log } from "../editor/output";
import { executeSyncTerminalCommand } from "../shared/utils/terminal";
import { editorInput } from "../editor/input";

function isDevToolsInstalled(): boolean {
    try{
        // executes mcdev --versio command to check if mcdev is installed
        // if not installed throws exception
        executeSyncTerminalCommand(installerConfig.package.mcdev.version);
        return true;
    }catch(error){
        log("debug", "mcdev is not installed.");
        return false;
    }
}

function installDevTools(){
    try{
        log("info", "Installing SFMC DevTools...");
        executeSyncTerminalCommand(installerConfig.package.mcdev.install);
        log("info", "Reloading workspace window...");
        // Reloads the workspace after DevTools installation
        editorWorkspace.reloadWorkspace();
    }catch(error){
        log("warning", "Something went wrong! SFMC DevTools installation failed.");
    }
}

async function noDevToolsHandler(){

    const message: string = `${installerConfig.messages.noDevToolsInstalled} ${installerConfig.messages.askUserToInstallDevTools}`;

    log("warning", installerConfig.messages.noDevToolsInstalled);

    // Asks if user wishes to install DevTools
    const userResponse: string | undefined = await editorInput.handleShowInformationMessage(
        message, 
        Object.keys(InstallDevToolsResponseOptions).filter((v) => isNaN(Number(v)))
    );

    log("debug", `noDevToolsHandler: user response = ${userResponse}`);

    if(userResponse && 
        InstallDevToolsResponseOptions[userResponse as keyof typeof InstallDevToolsResponseOptions]){
            installDevTools();
    }
}

export const devtoolsInstaller = {
    isDevToolsInstalled,
    installDevTools,
    noDevToolsHandler
};