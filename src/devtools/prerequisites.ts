import { prerequisitesConfig, NoPrerequisitesResponseOptions } from "../config/prerequisites.config";
import { executeSyncTerminalCommand } from "../shared/utils/terminal";
import { editorInput } from "../editor/input";
import { editorWebview } from "../editor/webview";
import { log } from "../editor/output";
import { devtoolsInstaller } from "./installer";
import { editorWorkspace } from "../editor/workspace";

interface PrerequisitesInstalledReturn { 
    prerequisitesInstalled: boolean, 
    missingPrerequisites: string[]
};

function arePrerequisitesInstalled(): PrerequisitesInstalledReturn {
    let prerequisiteResult: PrerequisitesInstalledReturn = { prerequisitesInstalled: true, missingPrerequisites: []};
    Object.entries(prerequisitesConfig.packages).forEach(([prerequisite, command]: string[]) => {
        try{
            // executes each prerequisite command to check if they are installed in the system
            // if not installed throws exception
            executeSyncTerminalCommand(
                command,
                editorWorkspace.getWorkspaceURIPath()
            );
        }catch(error){
            log("debug", `${prerequisite} is not installed.`);
            prerequisiteResult = { 
                prerequisitesInstalled: false, 
                missingPrerequisites: [...prerequisiteResult["missingPrerequisites"], prerequisite] 
            };
        }
    });
    return prerequisiteResult;
};

async function noPrerequisitesHandler(extensionPath: string, missingPrerequisites: string[]): Promise<void> {
    // checks if the one or more prerequisites are missing to show the correct message. 
    const missingPrerequisitesMessage: string = missingPrerequisites.length === 1 ? 
        prerequisitesConfig.messages["onePrerequisiteMissing"].replace("{{prerequisites}}", missingPrerequisites[0]) : 
        prerequisitesConfig.messages["multiplePrerequisitesMissing"].replace("{{prerequisites}}", missingPrerequisites.join(" and "));

    log("warning", missingPrerequisites);
    
    const message: string = `${missingPrerequisitesMessage} ${prerequisitesConfig.messages.askPrerequisitesToUser}`;

    // Asks if user wishes to follow the guide of how to install the prerequisites
    const userResponse: string | undefined = await editorInput.handleShowInformationMessage(
        message, 
        Object.keys(NoPrerequisitesResponseOptions).filter((v) => isNaN(Number(v)))
    );

    log("debug", `noPrerequisitesHandler: user response = ${userResponse}.`);

    // If yes creates an webview in vscode with a installation guide
    if(userResponse && NoPrerequisitesResponseOptions[userResponse as keyof typeof NoPrerequisitesResponseOptions]){
        editorWebview.create({
            id: prerequisitesConfig.webview.id,
            title: prerequisitesConfig.webview.title,
            extensionPath: extensionPath,
            filename: prerequisitesConfig.webview.filename,
            handler: ({ command }: { command: string }) => {
                if(command === "install"){
                    devtoolsInstaller.installDevTools();
                    return { dispose: true };
                }
                return { dispose: false };
            }
        });
    }
}

const devtoolsPrerequisites = {
    arePrerequisitesInstalled,
    noPrerequisitesHandler
};

export {
    PrerequisitesInstalledReturn,
    devtoolsPrerequisites
};