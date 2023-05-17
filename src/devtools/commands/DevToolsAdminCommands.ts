import { parseArrayJsonStringToArray } from "../../shared/utils/lib";
import DevToolsCommands from "./DevToolsCommands";

class DevToolsAdminCommands extends DevToolsCommands {

    private readonly type: string = "admin";
    private commandsConfig;
    private supportedMdType: {}[];
    private commandsList: { [key: string]: (...args: any) => void; } = {
        init: this.init,
        etypes: this.explainTypes
    };

    constructor(){
        super();
        this.commandsConfig = DevToolsCommands.getCommandsListByType(this.type);
        this.supportedMdType = [];
    }

    getCommand(id: string): () => void {
        return this.commandsList[id];
    }

    setSupportedMdTypes(mdTypes: {}[]): void {
        this.supportedMdType = mdTypes;
    };

    getSupportedMdTypes(): {}[] {
        return this.supportedMdType;
    };

    run(id: string, args: {[key: string]: string }, handleResult: (res: any) => void): void {
        this.runDTCommand(this.getCommand(id), args, handleResult);
    }

    init(args: {[key: string]: string}){
        console.log("Admin - Init Command - args = ", args);
    }

    async explainTypes(args: {[key: string]: string}, handleResult?: (res: any) => void){
        console.log("Admin - Explain Types Command - args = ", args);
        let [{ command }] = this.commandsConfig.filter(({ id }: { id: string }) => id.toLowerCase() === "etypes");
        if(!command){
            // throw error
        }
        command = command.replace("{{json}}", args["json"] ? "--json" : "");
        const mdTypes: string = await this.executeCommand(command, false);
        handleResult(parseArrayJsonStringToArray(mdTypes));
    }
}

export default DevToolsAdminCommands;