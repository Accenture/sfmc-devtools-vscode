import { InstallDevToolsResponseOptions, installerConfig } from "../config/installer.config";
import { editorWorkspace } from "../editor/workspace";
import { editorInput } from "../editor/input";
import { log } from "../editor/output";
import { terminal } from "../shared/utils/terminal";
import { lib } from "../shared/utils/lib";

async function isDevToolsInstalled(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
        terminal.executeTerminalCommand({
            command: installerConfig.package.mcdev.version,
            args: [],
            cwd: editorWorkspace.getWorkspaceURIPath(),
            handleResult(error: string | null, output: string | null, code: number | null) {
                if(code !== null){
                    log("debug", `[installer_isDevToolsInstalled] Exit Code: '${code}'`);  
                }
                if(output){
                    log("debug", `[installer_isDevToolsInstalled] Output: '${output}'`); 
                    resolve(output.length > 0);
                }
                if(error){
                    log("error", `[installer_isDevToolsInstalled] Error: '${error}'`);
                    resolve(false);
                }
            },
        });
    });
}

async function installDevTools(): Promise<void>{
    try{
        log("info", "Installing SFMC DevTools...");
        await editorInput.handleInProgressMessage(
            "Notification",
            (progress) => {
                progress.report({message: installerConfig.messages.installingDevToolsProgress});
                return new Promise<void>(resolve => {
                    terminal.executeTerminalCommand({
                        command: installerConfig.package.mcdev.install,
                        args: [],
                        cwd: editorWorkspace.getWorkspaceURIPath(),
                        handleResult: (error: string | null, output: string | null, code: number | null) => {
                            if(output){
                                log("info", output);
                            }
                            if(error){
                                log("error", `[installer_installDevTools] Exit Code ${error}`);
                            }
                            if(code !== null){
                                log("debug", `[installer_installDevTools] Exit Code ${code}`);
                                resolve();
                            }
                        },
                    });
                });
            }                   
        );
        log("info", "Reloading VSCode workspace window...");
        lib.waitTime(5000, () => {
            // Reloads the workspace after DevTools installation
            editorWorkspace.reloadWorkspace();
        });
    }catch(error){
        log("warning", "Something went wrong! SFMC DevTools installation failed.");
        log("error", `[installer_installDevTools] Failed to install DevTools: ${error}`);
    }
}

async function noDevToolsHandler(){

    const message: string = `${installerConfig.messages.noDevToolsInstalled} ${installerConfig.messages.askUserToInstallDevTools}`;

    log("warning", installerConfig.messages.noDevToolsInstalled);

    // Asks if user wishes to install DevTools
    const userResponse: string | undefined = await editorInput.handleShowOptionsMessage(
        message, 
        Object.keys(InstallDevToolsResponseOptions).filter((v) => isNaN(Number(v)))
    );

    log("debug", `[installer_noDevToolsHandler] User Response = ${userResponse}`);

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