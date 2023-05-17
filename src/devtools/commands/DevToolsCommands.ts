import { execInTerminal } from "../../shared/utils/terminal";
import * as commandsConfig from "./commands.config.json";

interface DevToolsCommandSetting {
    id: string,
    title: string,
    description: string,
    command: string,
    requiredParams: Array<string>,
    optionalParams: Array<string>,
    isAvailable: boolean
}

interface IDevToolsCommand {
    runDTCommand: (command: () => void, args: {[key: string]: string}) => void
}

abstract class DevToolsCommands implements IDevToolsCommand {
    name: string;

    abstract getCommand(id: string): void;
    abstract setSupportedMdTypes(mdTypes: {}[]): void;
    abstract run(id: string, args: {[key: string]: string | boolean}, handleResult?: (res:any) => void): void;

    runDTCommand(command: (...args: any) => void, args: {[key: string]: string}, handleResult?: (res:any) => void): void {
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
            return execInTerminal(command);
        }
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