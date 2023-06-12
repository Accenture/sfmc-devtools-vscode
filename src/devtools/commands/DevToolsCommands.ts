// import { execInTerminal } from "../../shared/utils/terminal";
import * as commandsConfig from "./commands.config.json";
import { log } from "../../editor/output";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";

interface IDevToolsCommand {
    runCommand: (command: () => void, args: {[key: string]: string}) => void
}

abstract class DevToolsCommands implements IDevToolsCommand {

    static readonly commandPrefix: string = "mcdev";
    static commandMap: {[key: string]: DevToolsCommands} | undefined;

    abstract getCommand(id: string): void;
    abstract setSupportedMdTypes(mdTypes: {}[]): void;
    abstract run(id: string, args: {[key: string]: string | boolean}, handleResult?: (res:any) => void): void;

    runCommand(command: (...args: any) => void, args: {[key: string]: string}, handleResult?: (res:any) => void): void {
        if(command !== undefined){
            const dtCommand = command.bind(this);
            dtCommand(args, handleResult);
        }else{
            throw Error("Invalid command"); // TODO Complete
        }
    }

    executeCommand(command: string, runWindowTerminal: boolean){
        console.log('Final Command = ', command);
        if(runWindowTerminal){
            //execInWindowTerminal(command);
        }else{
            // return execInTerminal(command);
        }
    }

    static init(){
        log("info", "Initializing DevTools Commands...");
        if(!this.commandMap){
            const commandTypes: Array<string> = this.getAllCommandTypes();
            this.commandMap = commandTypes.reduce((previous: {}, type: string) => {
                try{
                    const devToolsClass: DevToolsCommands = 
                        new (require(`./DevTools${type}Commands`)).default();
                    return { ...previous, [type.toLowerCase()]: devToolsClass };
                }catch(error){
                    log("error", `DevTools Command type '${type}' doesn't have a class configured: ${error}`);
                    return { ...previous };
                }
            }, {});
            log("debug", `DevToolsCommands: [${Object.keys(this.commandMap)}]`);
        }
    }

    static run(settings: DevToolsCommandSetting){

    }

    static getAllCommandTypes(): Array<string>{
        return Object.keys(commandsConfig)
            .filter((cmd: string) => commandsConfig[cmd as keyof typeof commandsConfig].isAvailable)
            .map((cmd: string) => commandsConfig[cmd as keyof typeof commandsConfig].title);
    }

    static getCommandsListByType(type: string): Array<DevToolsCommandSetting>{
        const { commands } = commandsConfig[type.toLowerCase() as keyof typeof commandsConfig];
        return commands ? 
            commands.filter((command: DevToolsCommandSetting) => command.isAvailable) : [];
    }
}

export default DevToolsCommands;