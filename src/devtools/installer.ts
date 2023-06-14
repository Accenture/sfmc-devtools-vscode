import { InstallDevToolsResponseOptions, installerConfig } from "../config/installer.config";
import { editorWorkspace } from "../editor/workspace";
import { editorInput } from "../editor/input";
import { log } from "../editor/output";
import { executeSyncTerminalCommand } from "../shared/utils/terminal";

function isDevToolsInstalled(): boolean {
    try{
        // executes mcdev --versio command to check if mcdev is installed
        // if not installed throws exception
        executeSyncTerminalCommand(
            installerConfig.package.mcdev.version,
            editorWorkspace.getWorkspaceURIPath()
        );
        return true;
    }catch(error){
        log("error", `installer_isDevToolsInstalled: Failed to check if DevTools is installed: ${error}`);
        return false;
    }
}

function installDevTools(){
    try{
        log("info", "Installing SFMC DevTools...");

        editorInput.handleInProgressMessage(
            "Notification",
            installerConfig.messages.installingDevToolsProgress,
            () => executeSyncTerminalCommand(
                    installerConfig.package.mcdev.install,
                    editorWorkspace.getWorkspaceURIPath()
                )
        );
        
        log("info", "Reloading workspace window...");
        // Reloads the workspace after DevTools installation
        editorWorkspace.reloadWorkspace();
    }catch(error){
        log("warning", "Something went wrong! SFMC DevTools installation failed.");
        log("error", `installer_installDevTools: Failed to install DevTools: ${error}`);
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