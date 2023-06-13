import { mainConfig } from "../config/main.config";
import { PrerequisitesInstalledReturn, devtoolsPrerequisites } from "./prerequisites";
import DevToolsCommands from "./commands/DevToolsCommands";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";
import DevToolsCommandSetting from "../shared/interfaces/devToolsCommandSetting";
import { devtoolsInstaller } from "./installer";
import { devtoolsContainers } from "./containers";
import { editorInput } from "../editor/input";
import { editorContext } from "../editor/context";
import { editorWorkspace } from "../editor/workspace";
import { editorCommands } from "../editor/commands";
import { log } from "../editor/output";





// async function handleCommandSelection(credentialBU: string){
//     const typesList: Array<string> = DevToolsCommands.getAllCommandTypes();
//     const selectedType = await editorInput.handleQuickPickSelection(
//         convertToCmdOptSettings(typesList),
//         COMMAND_INPUT_TITLES["selectType"],
//         false);
//     if(selectedType && selectedType.id){
//         const commandsList = DevToolsCommands.getCommandsListByType(selectedType.id);
//         const selectedDTCommand = await editorInput.handleQuickPickSelection(
//             convertToCmdOptSettings(commandsList),
//             COMMAND_INPUT_TITLES["selectCmd"],
//             false
//         );
//         if(selectedDTCommand && selectedDTCommand.id){
//             const dtClass: DevToolsCommands = devTools_commands_types_map[selectedType.id];
//             if(dtClass !== undefined){
//                 dtClass.run(selectedDTCommand.id, {
//                     bu: credentialBU.toLowerCase() === DEVTOOLS_EXTENSION_CONFIG.allPlaceholder.toLowerCase() ? '"*"' : credentialBU
//                 });
//             }
//         }
//     }
// }

// async function getSupportedMetadataTypes(): Promise<SupportedMetadataTypes[] | undefined> {
//     const { admin }: { admin?: DevToolsCommands } = devTools_commands_types_map;
//     if(admin !== undefined){
//         return await new Promise<SupportedMetadataTypes[]>((resolve) => {
//             admin.run("etypes", { json: true }, (result: SupportedMetadataTypes[]) => {
//                 resolve(result);
//             });
//         });
//     }else{
//         // throw exception TODO
//         return;
//     }
// }

// function executeExplorerMenuAction(action: string, path: string){
//     // Separates the selected folder/file path by the retrieve or deploy action    
//     const [ path1, path2 ]: Array<string> = path.split(`/${action}/`);
//     // Retrieves the all the standard devtools commands
//     const { standard }: { standard?: DevToolsCommands} = devTools_commands_types_map;
//     if(standard !== undefined){
//         let args: {[key: string]: string} = {};
//         // The user clicked on the top folder (retrieve or deploy)
//         if(path1 && !path2 && path1.endsWith(`/${action}`)){
//             args = {bu: `"*"`};
//         }
//         // The user clicked on a folder/file inside the top folder (retrieve or deploy)
//         if(path2){
//             let [ credName, bUnit, type, ...keys ]: Array<string> = path2.split("/");
//             // If user selected to retrieve/deploy a subfolder/file inside metadata type asset folder 
//             if(type === "asset" && keys.length){
//                 // Gets the asset subfolder and asset key
//                 const [ assetFolder, assetKey ] = keys;
//                 if(!assetKey){
//                     // if user only selected an asset subfolder
//                     // type will be changed to "asset-[name of the asset subfolder]"
//                     type = `${type}-${assetFolder}`;
//                 }
//                 // if user selects a file inside a subfolder of asset
//                 // the key will be the name of the file 
//                 keys = assetKey ? [ assetKey ] : [];
//             }

//             // result 1 - credential/*
//             // result 2 - credential/bu
//             // result 3 - credential/bu "metadata"
//             // result 4 - credential/bu "metadata" "key"
//             args = {
//                 bu: `${credName}/${bUnit ? bUnit : '*'}`, 
//                 mdtype: type ? `"${type}"` : "",
//                 key: keys.length ? `"${keys[0].split(".")[0]}"` : "",
//             };
//         }
//         standard.run(action, args);
//     }
// }

async function initDevToolsExtension(){

    try{
        log("info", "Running SFMC DevTools extension...");
        const isDevtoolsProject: boolean = await isADevToolsProject();
        
        // Executes the command setContext to indicate if the project
	    // is a DevTools Project or not
        editorCommands.executeCommand(
            "setContext", 
            [`sfmc-devtools-vscext.isDevToolsProject`, isDevtoolsProject]
        );

        // activate the context menus options
        devtoolsContainers.activateContextMenuCommands();

        // If it's already a mcdev project it will check if prerequisites and devtools are installed
        if(isDevtoolsProject){
            await handleDevToolsRequirements();
            return;
        }

        // activate status bar immediately when isDevToolsProject is false 
        devtoolsContainers.activateStatusBar(false, DevToolsCommands.commandPrefix);

    }catch(error){
        log("error", `main_initDevToolsExtension: ${error}`);
    }
}

async function isADevToolsProject(): Promise<boolean> {
    log("info", "Checking if folder is a SFMC DevTools project...");
    log("debug", `DevTools files: [${mainConfig.requiredFiles}]`);
    const findMcdevFiles: boolean[] = await Promise.all(mainConfig.requiredFiles
        .map(async(filename: string) => editorWorkspace.isFileInFolder(filename)));
    log("info", 
        `Folder ${findMcdevFiles.every((result: boolean) => result === true) ? 'is' : 'is not'} a SFMC DevTools project.`
    );
    return findMcdevFiles.every((result: boolean) => result === true);
}

async function handleDevToolsRequirements(): Promise<void>{
    log("info", "Checking SFMC DevTools requirements...");
    const prerequisites: PrerequisitesInstalledReturn = devtoolsPrerequisites.arePrerequisitesInstalled();
    log("info", `SFMC Pre-Requisites ${
        prerequisites.prerequisitesInstalled ? 'are' : 'are not'
    } installed.`);
    if(prerequisites.prerequisitesInstalled){
        if(!devtoolsInstaller.isDevToolsInstalled()){
            await devtoolsInstaller.noDevToolsHandler();
            return;
        }
        log("info", "SFMC DevTools is installed.");
        // activate status bar immediately when isDevToolsProject is false 
        devtoolsContainers.activateStatusBar(true, DevToolsCommands.commandPrefix);

        // init DevTools Commands
        DevToolsCommands.init();
        return;
    }
    log("debug", `Missing Pre-requisites: [${prerequisites.missingPrerequisites}]`);
    devtoolsPrerequisites.noPrerequisitesHandler(
        editorContext.get().extensionPath,
        prerequisites.missingPrerequisites
    );
}

function handleStatusBarActions(action: string){
    log("debug", "Setting Status Bar Actions...");
    log("debug", `Action: ${action}`);
    switch(action.toLowerCase()){
        case "sbcredentialbu":
            changeCredentialsBU();
            break;
        case "sbcommand":
            handleDevToolsSBCommand();
            break;
        case "sbinitialize":
            initialize();
            break;
        default:
            log("error", `main_handleStatusBarActions: Invalid Status Bar Action '${action}'`);
    }
}

function handleContextMenuActions(action: string, path: string){
    log("debug", "Setting Context Menu Actions...");
    log("debug", `Action: ${action} Path: ${path}`);
    switch(action.toLowerCase()){
        case "cmretrieve":
            handleDevToolsCMCommand("retrieve", path);
            break;
        case "cmdeploy":
            handleDevToolsCMCommand("deploy", path);
            break;
        default:
            log("error", `main_handleContextMenuActions: Invalid Context Menu Action '${action}'`);
    }
}

async function getCredentialsBU(): Promise<{[key: string]: string[] } | undefined >{
    try{
        // gets the project workspace uri path
        const folderPath: string = editorWorkspace.getWorkspaceURIPath();

        // retrieves all the content inside the file that contains the mcdev credentials
        const credBUContent: string = 
            await editorWorkspace.readFile(`${folderPath}/${mainConfig.credentialsFilename}`);

        // parses the content from text to JSON
        const parsedCredBUContent: any = JSON.parse(credBUContent);

        // return a json with each credential associated with a list of its business units
        if(parsedCredBUContent && "credentials" in parsedCredBUContent){
            return Object.keys(parsedCredBUContent.credentials)
                .reduce((prev: {}, credential: string) => {
                    const { businessUnits } = parsedCredBUContent.credentials[credential];
                    if(businessUnits && Object.keys(businessUnits).length){
                        return { ...prev, [credential]: Object.keys(businessUnits) };
                    }else{
                        log("error", `Could not find any business units for the credential '${credential}'`);
                        return {...prev };
                    }
                }, {});
        }
        log("error", `main_getCredentialsBU: Could not find any credentials in the '${mainConfig.credentialsFilename}' file.`);
        return;
    }catch(error){
        log("error", `main_getCredentialsBU: ${error}`);
        return;
    }
}

async function changeCredentialsBU(){
    log("info", "Changing SFMC DevTools credententials/bu...");
    const credentialsBUList: {[key: string]: string[]} | undefined = 
        await getCredentialsBU();

    if(credentialsBUList){
        // Configures all placeholder as an selectable option
        const allPlaceholderOption: InputOptionsSettings = {
            id: mainConfig.allPlaceholder.toLowerCase(),
            label: mainConfig.allPlaceholder,
            detail: ""
        };
        // Configures all credential names as selectable options
        const credentialsOptions: InputOptionsSettings[] = Object.keys(credentialsBUList)
            .map((credential: string) => ({
                id: credential.toLowerCase(),
                label: credential,
                detail: ""
            }));

        // Requests user to select one credential option
        const selectedCredential: InputOptionsSettings | undefined = 
            await editorInput.handleQuickPickSelection(
                [allPlaceholderOption, ...credentialsOptions],
                mainConfig.messages.selectCredential,
                false
            );

        if(selectedCredential){
            log("debug", `User selected '${selectedCredential.label}' credential.`);
            if(selectedCredential.id === mainConfig.allPlaceholder.toLowerCase()){
                // if user selects *All* then status bar should be replaced with it
                devtoolsContainers.modifyStatusBar(
                    "credentialbu", 
                    DevToolsCommands.commandPrefix, 
                    selectedCredential.label
                );
            }else{
                const businessUnitsList: string[] = credentialsBUList[selectedCredential.label];

                // Configures all business units names as selectable options
                const businessUnitOptions: InputOptionsSettings[] = businessUnitsList
                    .map((businessUnit: string) => ({
                        id: businessUnit.toLowerCase(),
                        label: businessUnit,
                        detail: ""
                    }));

                // Requests user to select all or one Business Unit
                const selectedBU: InputOptionsSettings | undefined = 
                    await editorInput.handleQuickPickSelection(
                        [allPlaceholderOption, ...businessUnitOptions],
                        mainConfig.messages.selectBusinessUnit,
                        false
                );
                
                if(selectedBU){
                    log("debug", `User selected '${selectedBU.label}' business unit.`);

                    // Modify the credential status bar icon to contain the 
                    // selected Credential + selected Business Unit
                    devtoolsContainers.modifyStatusBar(
                        "credentialbu", 
                        DevToolsCommands.commandPrefix, 
                        `${selectedCredential.label}/${selectedBU.label}`
                    );
                }
            }
        }
    }else{
        log("error", "main_changeCredentialsBU: CredentialBU List is undefined.");
    }
}

async function handleDevToolsSBCommand(){
    log("info", "Selecting SB SFMC DevTools command...");
    const devToolsCommandTypes: {id: string, title: string}[] = DevToolsCommands.getAllCommandTypes();
    
    if(devToolsCommandTypes){
        // Configures all commandTypes names as selectable options
        const commandTypesOptions: InputOptionsSettings[] = devToolsCommandTypes
            .map(({ id, title }: {id: string, title: string}) => ({
                id: id.toLowerCase(),
                label: title,
                detail: ""
        }));

        // Requests user to select one DevTools Command Type
        const selectedCommandType: InputOptionsSettings | undefined = 
            await editorInput.handleQuickPickSelection(
                commandTypesOptions,
                mainConfig.messages.selectCommandType,
                false
        );

        if(selectedCommandType){
            log("debug", `User selected in ${selectedCommandType.label} DevTools Command type.`);
            const commands: DevToolsCommandSetting[] = 
                DevToolsCommands.getCommandsListByType(selectedCommandType.id);

            // Configures all devtools commands as selectable options
            const commandsOptions: InputOptionsSettings[] = commands
                .map((command: DevToolsCommandSetting) => ({
                    id: command.id.toLowerCase(),
                    label: command.title,
                    detail: command.description
                }));
            // Requests user to select one DevTools Command Type
            const selectedCommandOption: InputOptionsSettings | undefined = 
                await editorInput.handleQuickPickSelection(
                    commandsOptions,
                    mainConfig.messages.selectCommand,
                    false
            );

            if(selectedCommandOption){
                log("debug", `User selected in ${selectedCommandOption.label} DevTools Command.`);
                if(devtoolsContainers.isCredentialBUSelected()){
                    log("info", "Credential/BU is selected...");
                    const selectedCredentialBU: string | undefined = 
                        devtoolsContainers.getCredentialsBUName(DevToolsCommands.commandPrefix);
                    if(selectedCredentialBU){
                        // execute DevTools Command
                        DevToolsCommands.runCommand(
                            selectedCommandType.id,
                            selectedCommandOption.id,
                            { bu: selectedCredentialBU.replace(mainConfig.allPlaceholder, "'*'") },
                            (result: any) => console.log(result) 
                        );
                    }else{
                        log("error", `main_handleDevToolsCommandSelection: Failed to retrieve Credential/BU.`);
                    }
                }else{
                    // show error TODO
                }
            }
        }
    }
}

function initialize(){
    log("debug", "Initialize DevTools status bar command");
}

function handleDevToolsCMCommand(action: string, path: string){
    log("info", "Selecting CM SFMC DevTools command...");

    let args: {[key: string]: string } = {};
    const [ projectPath, cmPath ]: string[] = path.split(`/${action}/`);;

    const workspaceUriFolder = editorWorkspace.getWorkspaceURIPath();

    log("debug", `Current workspace folder path: ${workspaceUriFolder}`);
    log("debug", `Context Menu Action path: ${projectPath}`);

    log("debug", `Context Menu Action outside of project directory? = ${workspaceUriFolder !== projectPath}`);

    if(projectPath && !cmPath && projectPath.endsWith(`/${action}`)){
        args = { bu: `"*"` };
    }

    if(cmPath){
        let [ credName, bUnit, type, ...keys ]: string[] = cmPath.split("/");
        let key: string = "";
        // If user selected to retrieve/deploy a subfolder/file inside metadata type asset folder 
        if(type === "asset" && keys.length){
            // Gets the asset subfolder and asset key
            const [ assetFolder, assetKey ] = keys;
            if(!assetKey){
                // if user only selected an asset subfolder
                // type will be changed to "asset-[name of the asset subfolder]"
                type = `${type}-${assetFolder}`;
            }
            // if user selects a file inside a subfolder of asset
            // the key will be the name of the file 
            keys = assetKey ? [ assetKey ] : [];
        }
    
        if(keys.length){
            const [ typeKey ]: string[] = keys;
            key = `"${typeKey.startsWith(".") ?
                '.' + typeKey.substring(1).split(".")[0] : 
                typeKey.split(".")[0]
            }"`;
        }

        // result 1 - credential/*
        // result 2 - credential/bu
        // result 3 - credential/bu "metadata"
        // result 4 - credential/bu "metadata" "key"
        args = {
            bu: `${credName}/${bUnit ? bUnit : '*'}`, 
            mdtype: type ? `"${type}"` : "",
            key: key,
        };
    }
    log("debug", `CM args passed to DevTools command: ${JSON.stringify(args)}`);
    DevToolsCommands.runCommand(
        "",
        action,
        args,
        (result: any) => console.log(result)
    )
}

export const devtoolsMain = {
    initDevToolsExtension,
    handleStatusBarActions,
    handleContextMenuActions
};