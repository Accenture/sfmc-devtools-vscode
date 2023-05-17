import DevToolsCommands from "./commands/DevToolsCommands";
import DevToolsAdminCommands from "./commands/DevToolsAdminCommands";
import DevToolsStandardCommands from "./commands/DevToolsStandardCommands";
import { readFile } from "../shared/utils/file";
import { editorInput } from "../editor/editorInput";
import SupportedMetadataTypes from "../shared/interfaces/supportedMetadataTypes";

interface DTStatusBarSettings {
    dtCredential: {
        command: string,
        title: string
    },
    dtCommand: {
        command: string,
        title: string
    }
};

const DEVTOOLS_STATUS_BAR_CREDBU: DTStatusBarSettings = {
    dtCredential: {
        command: "sfmc-devtools-vscode.credbu",
        title: "DT:Credential/BU"
    },
    dtCommand: {
        command: "sfmc-devtools-vscode.command",
        title: "DT:Command"
    }
};

const DEVTOOLS_MENU_ACTION_COMMAND_RETRIEVE: string = "sfmc-devtools-vscode.devToolsMenuActionRetrieve";
const DEVTOOLS_MENU_ACTION_COMMAND_DEPLOY: string = "sfmc-devtools-vscode.devToolsMenuActionDeploy";

const COMMAND_INPUT_TITLES: { [key: string]: string } = {
    credentialsName: "Select one of the credentials...",
    bussinessUnit: "Select one of the business units...",
    selectType: "Select the DevTools Command Type...",
    selectCmd: "Select the DevTools Command...",
    metaDataType: "Select one or more metadata types..."
};

const DEVTOOLS_EXTENSION_CONFIG: {[key: string]: any } = {
    mcdevrcFile:  ".mcdevrc.json",
    allPlaceholder: "*All*",
    devToolsClasses: [
        DevToolsAdminCommands, 
        DevToolsStandardCommands
    ],
    getClassName: (type: string) => `DevTools${type}Commands`
};

// eslint-disable-next-line @typescript-eslint/naming-convention
let devTools_commands_types_map: {[key: string]: DevToolsCommands} = {};

async function init(): Promise<void> {
    devTools_commands_types_map = DevToolsCommands.getAllCommandTypes()
        .reduce((prev: {}, type: string) => {
            const [ dtCommand ] = DEVTOOLS_EXTENSION_CONFIG.devToolsClasses
                .filter((dtClass: DevToolsCommands) => 
                    dtClass.name.toLowerCase() === DEVTOOLS_EXTENSION_CONFIG.getClassName(type).toLowerCase());
            if(dtCommand !== undefined){
                return {
                    ...prev,
                    [type.toLowerCase()]: new dtCommand(editorInput)
                };
            }
            return {...prev};
    }, {});
    const mdTypes: SupportedMetadataTypes[] = await getSupportedMetadataTypes();
    Object.values(devTools_commands_types_map).forEach(
        (command: DevToolsCommands) => command.setSupportedMdTypes(mdTypes)
    );
}

function convertToCmdOptSettings(options: Array<string | {id: string, title: string, description: string}>){
    return options.map(opt => {
        if(typeof opt === "string"){
            return {id: opt.toLowerCase(), label: opt, detail: ""};
        }
        if(typeof opt === "object"){
            return {id: opt.id.toLowerCase(), label: opt.title, detail: opt.description};
        }
    }).filter(val => val !== undefined);
}

async function getAllCredentials(): Promise<{ [key: string]: string[]; }> {
    const { credentials }: { credentials: any } = JSON.parse(await readFile(DEVTOOLS_EXTENSION_CONFIG.mcdevrcFile));
    if(Object.keys(credentials).length){
        const credentialsList: {[key: string]: Array<string>} = Object.keys(credentials)
            .reduce((prev, curr) => {
                // get business units
                const { businessUnits } = credentials[curr];
                const buList = businessUnits ? Object.keys(businessUnits) : [];
                return {...prev, [curr]: buList};
            }, {});
        return credentialsList;
    }
    return {};
}

async function handleCredentialChange(){
    const { allPlaceholder } = DEVTOOLS_EXTENSION_CONFIG;
    const credentials: {[key: string]: Array<string>} = await getAllCredentials();
    const selectedCredentialName = await editorInput.handleQuickPickSelection(
        convertToCmdOptSettings([allPlaceholder, ...Object.keys(credentials)]),
        COMMAND_INPUT_TITLES["credentialsName"],
        false
    );
    if(selectedCredentialName && selectedCredentialName.id && selectedCredentialName.label){
        if(selectedCredentialName.id === allPlaceholder.toLowerCase()){
            return allPlaceholder;
        }
        const selectedBusinessUnit = await editorInput.handleQuickPickSelection(
            convertToCmdOptSettings([ allPlaceholder ,...credentials[selectedCredentialName.label]]),
            COMMAND_INPUT_TITLES["bussinessUnit"],
            false
        );
        if(selectedBusinessUnit && selectedBusinessUnit.id && selectedBusinessUnit.label){
            return `${selectedCredentialName.label}/`+
                `${selectedBusinessUnit.id === allPlaceholder.toLowerCase() ? allPlaceholder : selectedBusinessUnit.label}`;
        }
    }
}

function handleSupportedMetadataTypes(){
    
}

async function handleCommandSelection(credentialBU: string){
    const typesList: Array<string> = DevToolsCommands.getAllCommandTypes();
    const selectedType = await editorInput.handleQuickPickSelection(
        convertToCmdOptSettings(typesList),
        COMMAND_INPUT_TITLES["selectType"],
        false);
    if(selectedType && selectedType.id){
        const commandsList = DevToolsCommands.getCommandsListByType(selectedType.id);
        const selectedDTCommand = await editorInput.handleQuickPickSelection(
            convertToCmdOptSettings(commandsList),
            COMMAND_INPUT_TITLES["selectCmd"],
            false
        );
        if(selectedDTCommand && selectedDTCommand.id){
            const dtClass: DevToolsCommands = devTools_commands_types_map[selectedType.id];
            if(dtClass !== undefined){
                dtClass.run(selectedDTCommand.id, {
                    bu: credentialBU.toLowerCase() === DEVTOOLS_EXTENSION_CONFIG.allPlaceholder.toLowerCase() ? '"*"' : credentialBU
                });
            }
        }
    }
}

async function getSupportedMetadataTypes(): Promise<SupportedMetadataTypes[]> | undefined {
    const { admin }: { admin?: DevToolsCommands } = devTools_commands_types_map;
    if(admin !== undefined){
        return await new Promise<SupportedMetadataTypes[]>((resolve) => {
            admin.run("etypes", { json: true }, (result: SupportedMetadataTypes[]) => {
                resolve(result);
            });
        });
    }else{
        // throw exception TODO
        return;
    }
}

function executeExplorerMenuAction(action: string, path: string){
    // Separates the selected folder/file path by the retrieve or deploy action    
    const [ path1, path2 ]: Array<string> = path.split(`/${action}/`);
    // Retrieves the all the standard devtools commands
    const { standard }: { standard?: DevToolsCommands} = devTools_commands_types_map;
    if(standard !== undefined){
        let args: {[key: string]: string} = {};
        // The user clicked on the top folder (retrieve or deploy)
        if(path1 && !path2 && path1.endsWith(`/${action}`)){
            args = {bu: `"*"`};
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
                mdtype: type ? `"${type}"` : "",
                key: keys.length ? `"${keys[0].split(".")[0]}"` : "",
            };
        }
        standard.run(action, args);
    }
}

export const devToolsExtension = {
    init,
    DEVTOOLS_STATUS_BAR_CREDBU,
    DEVTOOLS_MENU_ACTION_COMMAND_RETRIEVE,
    DEVTOOLS_MENU_ACTION_COMMAND_DEPLOY,
    handleCredentialChange,
    handleCommandSelection,
    executeExplorerMenuAction
};