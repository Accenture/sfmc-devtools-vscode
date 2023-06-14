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
            path: string,
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
            commandPath,
            commandResultHandler 
        }: DevToolsCommandRunner = commandRunner;

        log("debug", `Running DevTools Admin Command for id '${commandId}'.`);
        if(commandId in this.commandMethods){
            this.commandMethods[commandId](commandConfig, commandArgs, commandPath, commandResultHandler);
        }else{
            log("error", `DevTools Admin Command method for id '${commandId}' is not implemented.`);
        }
    }

    setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.metadataTypes = mdTypes;
    }

    init(commandConfig: DevToolsCommandSetting, args: {[key: string]: any}, path: string, handleResult: (result: any) => void){
        log("info", `Running DevTools Admin Command: Explain Types...`);

    }

    async explainTypes(config: DevToolsCommandSetting, args: {[key: string]: any }, path: string, handleResult: (result: any) => void){
        log("info", `Running DevTools Admin Command: Explain Types...`);
        if("command" in config && config.command){
            const commandConfigured: string | undefined = 
                await this.configureCommandWithParameters(
                    config, 
                    { json: "json" in args && args.json ? "--json" : ""},
                    []
                );
            log("debug", `Explain types final command: ${commandConfigured}`);
            const commandResult = this.executeCommand(commandConfigured, path);
            handleResult(commandResult);
        }else{
            log("error", "DevToolsAdminCommand_explainTypes: Command is empty or missing the configuration.");
        }
    }

}

export default DevToolsAdminCommands;