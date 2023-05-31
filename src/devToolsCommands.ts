import { window } from "vscode";
import * as commandsConfig from "./commands.json";
import { execInTerminal, execInWindowTerminal, readFile } from "./utils";
import { log } from "./editorLogger";

interface DTCommand {
    id: string,
    title: string,
    command: string,
    parameters: Array<string>,
    description: string,
    isAvailable: boolean
}

interface CommandOptionsSettings {
    id: string,
    label: string,
    detail: string,
    dtCommand?: {command: string, args: {[key: string]: string}},
};

interface SupportedMdTypes {
    name: string,
    apiName: string,
    retrievedByDefault: boolean,
    supports: { [key: string]: boolean },
    description: string
}

const allPlaceholder: string = "*All*";
const COMMAND_INPUT_TITLES: { [key: string]: string } = {
    selectType: "Select the DevTools Command Type...",
    selectCmd: "Select the DevTools Command...",
    credentialsName: "Select one of the credentials...",
    bu: "Select one of the business units...",
    metaDataType: "Select one or more metadata types..."

};

const COMMAND_TYPES_HANDLERS: { [key: string]: (command: string, args: {[key: string]: string}) => void} = {
    admin: handleAdminCommand,
    standard: handleStandardCommand,
    templating: handleTemplatingCommand
};

const COMMAND_PARAMETERS_HANDLERS: {[key: string]: (param: {[key: string]: any}, supportedAction: string) => Promise<string>} = {
    bu: buHandler,
    credentialsName: credentialsHandler,
    type: typeHandler
};

let supportedMdTypes: Array<SupportedMdTypes> = [];

function getCommandsTypes(): Array<{id: string, label: string}>{
    return Object.keys(commandsConfig)
    .filter((cmd: string) => commandsConfig[cmd as keyof typeof commandsConfig].isAvailable)
    .map((cmd: string) => ({ id: cmd, label: commandsConfig[cmd as keyof typeof commandsConfig].title }));
}

function getCommandsListByType(type: string): Array<DTCommand>{
        return Object.keys(commandsConfig).includes(type) ? commandsConfig[type as keyof typeof commandsConfig].commands : [];
}

async function executeCredentialsSelection(){
    const mcdevrc: {[key: string]: any} = JSON.parse(await readFile(".mcdevrc.json"));
    const selectedCredentialBU = await buHandler(mcdevrc);
    return selectedCredentialBU;
}

async function handleAdminCommand(command: string, args: {[key: string]: string}) {
    if(command){
        if("json" in args){
            if(args.json !== ""){
                const mdTypes: Array<SupportedMdTypes> = JSON.parse(
                    await execInTerminal(`${command} ${args["json"]}`)
                );
                return mdTypes;
            }else{
                execInWindowTerminal(command);
            }
        }
    }
}

async function handleStandardCommand(command: string, args: {[key: string]: string}) {
    if(command){
        const paramArray = await Promise.all(Object.keys(args).map(async(param: string) => {
            let paramInput: string = '';
            if(args[param as keyof typeof args]){
                paramInput = `${args[param as keyof typeof args]}`; 
            }else{
                if(Object.keys(COMMAND_PARAMETERS_HANDLERS).includes(param.toLowerCase())){
                    const paramHandler = COMMAND_PARAMETERS_HANDLERS[param.toLowerCase()];
                    paramInput = await paramHandler({}, command.includes("retrieve") ? "retrieve" : "update");
                    if(!paramInput){
                        return paramInput;
                    }
                }
            }
            return paramInput.replace(allPlaceholder, "*");
        }));
        if(!paramArray.some(arg => arg === undefined || arg === null)){
            try{
                execInWindowTerminal(`${command} ${paramArray.join(" ")}`);
            }catch(err){
                console.error("err = ", err);
                log("error", err);
            }
        }
    }
}

function handleTemplatingCommand(command: string, args: {[key: string]: string}) {
}

async function buHandler(mcdevrc: {[key: string]: any}){
    const selectedCredential: string = await credentialsHandler(mcdevrc);
    if(selectedCredential){
        if(selectedCredential.toLowerCase() === allPlaceholder.toLowerCase()){
            return "*All*";
        }
        const selectedBU = await window.showQuickPick(
            [allPlaceholder, ...Object.keys(mcdevrc["credentials"][selectedCredential]["businessUnits"])], 
            { placeHolder: COMMAND_INPUT_TITLES["bu"], canPickMany: false, ignoreFocusOut: true }
        );
        return `${selectedCredential}/${selectedBU.toLowerCase() === allPlaceholder.toLowerCase() ? "*All*" : selectedBU}`;
    }
    return null;
}

async function typeHandler(mcdevrcJson: {[key: string]: any}, supportedAction: string){
    if(!supportedMdTypes.length){
        const availableDTCommands: Array<DTCommand> = getCommandsListByType("admin").filter(cmd => cmd.isAvailable);
        if(availableDTCommands.length){
            const [ { command, parameters }]: Array<DTCommand> = availableDTCommands;
            supportedMdTypes = await handleAdminCommand(
                command, 
                parameters.reduce((prev, curr) => ({...prev, [curr]: curr === "json" ? "--json" : curr}), {})
            );
        }
    }
    const supportedMdTypesByAction = supportedMdTypes.filter(
        (mdType: SupportedMdTypes) => supportedAction in mdType.supports && mdType.supports[supportedAction]
    );
    const selectedTypes = await window.showQuickPick(
        supportedMdTypesByAction.map((mdType: SupportedMdTypes) => ({id: mdType.apiName, label: mdType.name})), 
            { placeHolder: COMMAND_INPUT_TITLES['metaDataType'], canPickMany: true, ignoreFocusOut: true }
        );
    if(selectedTypes.length){
        return `"${selectedTypes.map((type: {id: string, label: string}) => type.id).join(",")}"`;
    }
    return null;
}

async function credentialsHandler(mcdevrcJson: {[key: string]: any}){
    if(Object.keys(mcdevrcJson).length && Object.keys(mcdevrcJson).includes("credentials")){
        const selectedCredential = await window.showQuickPick(
            [allPlaceholder, ...Object.keys(mcdevrcJson["credentials"])], 
            { placeHolder: COMMAND_INPUT_TITLES['credentialsName'], canPickMany: false, ignoreFocusOut: true }
        );
        return selectedCredential;
    }
    return null;
}

async function executeCommandBarSelection(selectedCredBU: string){
    // Gets list of types of Commands (admin, standard, templating) configured
    const cmdTypeSettingsList: Array<CommandOptionsSettings> = getCommandsTypes().map((type: {id:string, label: string}) => ({
        ...type, 
        detail: `Example: ${getCommandsListByType(type.id).filter(cmd => cmd.isAvailable).map(cmd => cmd.title)}` 
    }));

    // Makes user select the command type
    const selectedCmdType: CommandOptionsSettings = 
        await window.showQuickPick(cmdTypeSettingsList, { placeHolder: COMMAND_INPUT_TITLES['selectType'], ignoreFocusOut: true });

    if(selectedCmdType && Object.keys(COMMAND_TYPES_HANDLERS).includes(selectedCmdType.id)){
        // Gets all the devtools commands from the selected type
        const availableDTCommands: Array<DTCommand> = getCommandsListByType(selectedCmdType.id).filter(cmd => cmd.isAvailable);
        // Configure to the Command Options settings to be displayed as a editor option
        const commandOptions: Array<CommandOptionsSettings> = availableDTCommands.map((dtCmd: DTCommand) => ({
            id: dtCmd.id,
            label: dtCmd.title,
            detail: dtCmd.description,
            dtCommand: {
                command: dtCmd.command,
                args: Object.assign({}, ...dtCmd.parameters.map((param: string) => ({[param]: ""}))) 
            }
        }));

        // Makes user select the devtool command
        const selectedDTCommand: CommandOptionsSettings = 
            await window.showQuickPick(commandOptions,  { placeHolder: COMMAND_INPUT_TITLES["selectCmd"], ignoreFocusOut: true });
        
        // Executes the command based on the type selected
        if(selectedDTCommand && Object.keys(selectedDTCommand.dtCommand).length){
            const { command, args }: { command: string, args: {[key: string]: string}} = selectedDTCommand.dtCommand;
            const commandHandler = COMMAND_TYPES_HANDLERS[selectedCmdType.id];
            commandHandler(command, { ...args, bu: selectedCredBU });
        }
    }
}

function executeExplorerMenuAction(action: string, path: string){
    // Separates the selected folder/file path by the retrieve or deploy action    
    const [ path1, path2 ]: Array<string> = path.split(`/${action}/`);
    // Retrieves the all the standard devtools commands
    const [ cmd ]: Array<DTCommand> = commandsConfig["standard"].commands.filter(({ id }: { id: string }) => id === action);
    if(Object.keys(cmd).length){
        const { command, parameters }: DTCommand = cmd;
        let args: {[key: string]: string} = {};
        // The user clicked on the top folder (retrieve or deploy)
        if(path1 && !path2 && path1.endsWith(`/${action}`)){
            args = {
                ...Object.assign({}, ...parameters.map((param: string) => ({[param]: ""}))), 
                bu: `"${allPlaceholder}"`
            };
        }
        // The user clicked on a folder/file inside the top folder (retrieve or deploy)
        if(path2){
            let [ credName, bUnit, type, ...keys ]: Array<string> = path2.split("/");
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

            // result 1 - credential/*
            // result 2 - credential/bu
            // result 3 - credential/bu "metadata"
            // result 4 - credential/bu "metadata" "key"
            args = {
                bu: `${credName}/${bUnit ? bUnit : '*'}`, 
                type: type ? `"${type}"` : "",
                key: keys.length ? `"${keys[0].split(".")[0]}"` : "",
            };
        }
        handleStandardCommand(command, args);
    }
}

export const devToolsCommands = {
    executeCommandBarSelection,
    executeCredentialsSelection,
    executeExplorerMenuAction
};