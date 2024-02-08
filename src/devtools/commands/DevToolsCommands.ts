// import { execInTerminal } from "../../shared/utils/terminal";
import * as commandsConfig from "./commands.config.json";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";
import DevToolsCommandRunner from "../../shared/interfaces/devToolsCommandRunner";
import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";
import InputOptionsSettings from "../../shared/interfaces/inputOptionsSettings";
import { editorInput } from "../../editor/input";
import { log } from "../../editor/output";
import { lib } from "../../shared/utils/lib";
import { terminal } from "../../shared/utils/terminal";

abstract class DevToolsCommands {

    static readonly commandPrefix: string = "mcdev";
    static commandMap: { [key: string]: DevToolsCommands };

    abstract run(commandRunner: DevToolsCommandRunner): void;
    abstract setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void;
    abstract getMetadataTypes(): SupportedMetadataTypes[] | void;
    abstract isSupportedMetadataType(action: string, metadataType: string): boolean | void;

    executeCommand(command: string, path: string, showOnTerminal: boolean): Promise<string | number>{
        log("info", `Running DevTools Command: ${command}`);
        return new Promise<string | number>(async resolve => {
            terminal.executeTerminalCommand({
                command: command,
                args: [],
                cwd: path,
                handleResult(error: string | null, output: string | null, code: number | null) {
                    if(code !== null){
                        log("debug", `[DevToolsCommands_executeCommand] Exit Code: '${code}'`);
                        resolve(code);
                    }
                    if(error){
                        log("error", `[DevToolsCommands_executeCommand] Exit Code: ${error}`);
                    }
                    if(output){
                        showOnTerminal ? log("info",  output) : resolve(output);
                    }
                },
            });
        });
    }

    async configureCommandWithParameters(
        config: DevToolsCommandSetting, 
        args: {[key: string]: string | string[] | boolean },
        mdTypes: SupportedMetadataTypes[]): Promise<string> {

        log("debug", `ConfigureCommandWithParameters: ${JSON.stringify(config)}`);
        let { command } = config;
        // Configured required Params
        if("requiredParams" in config && config.requiredParams.length){
            for(const param of config.requiredParams){
                if(param in args && args[param]){
                    command = command.replace(`{{${param}}}`, args[param] as string);
                }else{
                    // Requests user
                    if(param.toLowerCase() === "mdtypes" && mdTypes.length){
                        const userSelecteMDTypes: string | undefined = 
                            await this.handleMetadataTypeRequest(mdTypes);
                        if(userSelecteMDTypes){
                            command = command.replace(`{{${param}}}`, `"${userSelecteMDTypes}"`);
                        }
                    }
                }
            }
        }
        // Configured optional Params
        if("optionalParams" in config && config.optionalParams.length){
            config.optionalParams.forEach((param: string) => {
                if(typeof args[param] === "boolean"){
                    // if args[paran] is true it puts in the command the format --param (eg --json --fromRetrieve)
                    args[param] = args[param] 
                        ? `--${param}`
                        : "";
                }
                command = command.replace(`{{${param}}}`, param in args ? args[param] as string : "");
            });
        }
        return command;
    }

    async handleMetadataTypeRequest(mdTypes: SupportedMetadataTypes[]): Promise<string | undefined> {
        const mdTypeInputOptions: InputOptionsSettings[] = 
            mdTypes.map((mdType: SupportedMetadataTypes) => ({
                id: mdType.apiName,
                label: mdType.name,
                detail: ""
            }));
        const userResponse: InputOptionsSettings | InputOptionsSettings[] | undefined = 
            await editorInput.handleQuickPickSelection(
                mdTypeInputOptions,
                "Please select one or multiple metadata types...",
                true
            );
        if(userResponse && Array.isArray(userResponse)){
            const mdTypes: string = `${userResponse.map((response: InputOptionsSettings) => response.id)}`;
            log("debug", 
                `User selected metadata types: "${mdTypes}"`
            );
            return mdTypes;
        }
        return;
    }

    hasPlaceholders(command: string): boolean {
        const pattern: RegExp = /{{.*?}}/g;
        return pattern.test(command);
    }

    async handleUserInputBox(placeholderText: string): Promise<string | undefined> {
        const response: string | undefined = await editorInput.handleShowInputBox(placeholderText);
        return response;
    }

    static init(path: string){
        log("info", "Initializing DevTools Commands...");
        if(!this.commandMap){
            const commandTypes: {id: string}[] = this.getAllCommandTypes();
            this.commandMap = commandTypes.reduce((previous: {}, { id }: { id: string }) => {
                try{
                    // Instanciates a new type with all the commands by type configured
                    const devToolsClass: DevToolsCommands = 
                        new (require(`./DevTools${lib.capitalizeFirstLetter(id)}Commands`)).default();

                    return { ...previous, [id.toLowerCase()]: devToolsClass };
                }catch(error){
                    log("error", 
                        `DevToolsCommands_init: Command type '${lib.capitalizeFirstLetter(id)}' doesn't have a class configured: ${error}`
                    );
                    return { ...previous };
                }
            }, {});
        }

        log("debug", `DevToolsCommands: [${Object.keys(this.commandMap)}]`);
        log("info", "Get DevTools Supported Metadata Types.");
        this.runCommand(
            "admin", 
            "etypes", 
            path, 
            { json: true }, 
            {
                handleCommandResult: ({ success, data }: { success: boolean, data: string}) => {
                    if(success){
                        // Parses the list of supported mtdata types
                        const parsedResult: SupportedMetadataTypes[] = JSON.parse(data);
                        if(parsedResult && parsedResult.length){
                            // Sends the supported mtdata types to each DevTools Command
                            Object.keys(this.commandMap).forEach((key: string) => {
                                const devToolCommand: DevToolsCommands = 
                                    this.commandMap[key];
                                devToolCommand.setMetadataTypes(parsedResult);
                            });
                        }else{
                            log("error", "DevToolsCommands_init: Failed to parse supported metadata type result.");
                        }
                    }else{
                            log("error", "DevToolsCommands_init: Admin Command etypes failed.");
                    }
                }
            }
        );
    }

    static async runCommand(
        typeId: string | null, 
        commandId: string, 
        commandPath: string, 
        args: {[key: string]: string | string[] | boolean}, 
        commandHandlers: {[key: string]: (args?: any) => void}){
        // When the DevTools command type is unknown to the application
        if(!typeId && commandId){
            const [{ id }]: { id: string }[] = 
                this.getAllCommandTypes().filter(({ id }: {id: string}) => 
                    this.getCommandsListByType(id)
                        .filter(({ id }) => id === commandId).length > 0
                );
           
            if(id !== undefined){
                typeId = id;
            }else{
                log("error", 
                    `DevToolsCommands_runCommand: Failed to retrieve the command type for command id '${commandId}'.`
                );
                return;
            }
        }

        if(this.commandMap){
            if(typeId && typeId in this.commandMap){
                const [ commandConfig ]: DevToolsCommandSetting[] = 
                    this.getCommandsListByType(typeId)
                    .filter((commandSetting: DevToolsCommandSetting) => commandSetting.id === commandId);
                
                if(commandConfig && Object.keys(commandConfig).length){
                    const devToolsCommandClass: DevToolsCommands = this.commandMap[typeId];
                    devToolsCommandClass.run({
                        commandId,
                        commandConfig,
                        commandArgs: args,
                        commandPath,
                        commandHandlers: commandHandlers
                    });
                    return;
                }
                log("error", 
                    `DevToolsCommands_runCommand: Command with Id '${commandId}' doesn't have a DevTools command configured.`
                );
                return;
            }
            log("error", 
                `DevToolsCommands_runCommand: Command type Id '${typeId}' doesn't have a DevTools Command Class configured.`
            );
            return;
        }
        log("error", 
            `[DevToolsCommands_runCommand] Error: Command Map is not configured configured.`
        );
    }

    static getAllCommandTypes(): Array<{id: string, title: string}>{
        return Object.keys(commandsConfig)
            .filter((cmd: string) => commandsConfig[cmd as keyof typeof commandsConfig].isAvailable)
            .map((cmd: string) => ({
                id: commandsConfig[cmd as keyof typeof commandsConfig].id,
                title: commandsConfig[cmd as keyof typeof commandsConfig].title
            }));
    }

    static getCommandsListByType(type: string): DevToolsCommandSetting[]{
        const { commands } = commandsConfig[type.toLowerCase() as keyof typeof commandsConfig];
        return commands ? 
            commands.filter((command: DevToolsCommandSetting) => command.isAvailable) : [];
    }

    static requiresCredentials(id: string): boolean {
        if(id in commandsConfig){
            return commandsConfig[id as keyof typeof commandsConfig].requireCredentials;
        }
        log("error", `[DevToolsCommands_runCommand] Error: Failed to retrieve ${id} from commands configuration.`);
        return false;
    }

    static isSupportedMetadataType(action: string, metadataType: string){
        if("standard" in this.commandMap){
            const devToolsCommand: DevToolsCommands = this.commandMap["standard"];
            return devToolsCommand.isSupportedMetadataType(action, metadataType);
        }
        log("error", 
            `[DevToolsCommands_isSupportedMetadataType] Error: Failed to retrieve DevTools Standard Commands from commands configuration.`
        );
        return false;
    }
}

export default DevToolsCommands;