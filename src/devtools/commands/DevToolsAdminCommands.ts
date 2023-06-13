import { log } from "../../editor/output";
import DevToolsCommands from "./DevToolsCommands";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";
import DevToolsCommandRunner from "../../shared/interfaces/devToolsCommandRunner";
import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";

class DevToolsAdminCommands extends DevToolsCommands {

    private commandMethods: {
        [key: string]: (
            config: DevToolsCommandSetting, 
            args: {[key: string]: any }, 
            handleResult: (result: any) => void) 
                => void
    } = {};
    private metadataTypes: SupportedMetadataTypes[] = [];
    constructor(){
        super();
        log("debug", "DevToolsAdminCommands Class created");
        this.commandMethods = {
            init: this.init.bind(this),
            etypes: this.explainTypes.bind(this)
        };
    }

    run(commandRunner: DevToolsCommandRunner): void {
        const { 
            commandId, 
            commandConfig,
            commandArgs,
            commandResultHandler 
        }: DevToolsCommandRunner = commandRunner;

        log("debug", `Running DevTools Admin Command for id '${commandId}'.`);
        if(commandId in this.commandMethods){
            this.commandMethods[commandId](commandConfig, commandArgs, commandResultHandler);
        }else{
            log("error", `DevTools Admin Command method for id '${commandId}' is not implemented.`);
        }
    }

    setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.metadataTypes = mdTypes;
    }

    init(commandConfig: DevToolsCommandSetting, args: {[key: string]: any}){
        log("info", `Running DevTools Admin Command: Explain Types...`);
        console.log(commandConfig);
        console.log(args);
    }

    explainTypes(config: DevToolsCommandSetting, args: {[key: string]: any }, handleResult: (result: any) => void){
        log("info", `Running DevTools Admin Command: Explain Types...`);
        let command: string = "";
        if("command" in config && config.command){
            command = config.command;
            log("debug", `Explain types basic command: ${command}`);
            command = command.replace("{{json}}", args.json ? "--json" : "");
            log("debug", `Explain types final command: ${command}`);
            const result = this.executeCommand(command);
            handleResult(result);
        }
    }

}

export default DevToolsAdminCommands;