// import { execInTerminal } from "../../shared/utils/terminal";
import * as commandsConfig from "./commands.config.json";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";
import DevToolsCommandRunner from "../../shared/interfaces/devToolsCommandRunner";
import { log } from "../../editor/output";
import { lib } from "../../shared/utils/lib";
import { executeSyncTerminalCommand } from "../../shared/utils/terminal";
import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";

abstract class DevToolsCommands {

    static readonly commandPrefix: string = "mcdev";
    static commandMap: { [key: string]: DevToolsCommands };

    abstract run(commandRunner: DevToolsCommandRunner): void;
    abstract setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void;

    executeCommand(command: string){
        console.log('Final Command = ', command);
        return executeSyncTerminalCommand(command);
    }

    static init(){
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
        this.runCommand("admin", "etypes", { json: true }, ((result: any) => {
            // Parses the list of supported mtdata types
            const parsedResult: SupportedMetadataTypes[] = JSON.parse(result);
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
        }));
    }

    static runCommand(typeId: string, commandId: string, args: any, handleResult: (result: any)=> void ){
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
            if(typeId in this.commandMap){
                const [ commandConfig ]: DevToolsCommandSetting[] = 
                    this.getCommandsListByType(typeId)
                    .filter((commandSetting: DevToolsCommandSetting) => commandSetting.id === commandId);
                
                if(commandConfig && Object.keys(commandConfig).length){
                    const devToolsCommandClass: DevToolsCommands = this.commandMap[typeId];
                    devToolsCommandClass.run({
                        commandId,
                        commandConfig,
                        commandArgs: args,
                        commandResultHandler: handleResult
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
            `DevToolsCommands_runCommand: Command Map is not configured configured.`
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
}

export default DevToolsCommands;