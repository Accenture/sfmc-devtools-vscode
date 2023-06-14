import DevToolsCommands from "./DevToolsCommands";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";
import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";
import DevToolsCommandRunner from "../../shared/interfaces/devToolsCommandRunner";
import { log } from "../../editor/output";

class DevToolsStandardCommands extends DevToolsCommands {

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
        log("debug", "DevToolsStandardCommands Class created");
        this.commandMethods = {
            retrieve: this.retrieve.bind(this),
            deploy: this.deploy.bind(this)
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

        log("debug", `Running DevTools Standard Command for id '${commandId}'.`);
        if(commandId in this.commandMethods){
            this.commandMethods[commandId](commandConfig, commandArgs, commandPath, commandResultHandler);
        }else{
            log("error", `DevTools Standard Command method for id '${commandId}' is not implemented.`);
        }
    }

    setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.metadataTypes = mdTypes;
    }

    async retrieve(config: DevToolsCommandSetting, args: {[key: string]: string }, path: string, handleResult: (result: any) => void){
        log("info", `Running DevTools Standard Command: Retrieve...`);
        if("command" in config && config.command){
            // Gets that metadata types that are supported for retrieve
            const supportedMdTypes: SupportedMetadataTypes[] = this.metadataTypes
                .filter((mdType: SupportedMetadataTypes) => mdType.supports.retrieve);
            
            // Configures the command to replace all the parameters with the values
            const commandConfigured: string | undefined = 
                await this.configureCommandWithParameters(
                    config, 
                    args,
                    supportedMdTypes
                );

            // Checks if the command is still missing so required parameter
            if(this.hasPlaceholders(commandConfigured)){
                log("debug", `Required Parameters missing from Retrieve command: ${commandConfigured}`);
                return;
            }

            log("debug", `Retrieve Command configured: ${commandConfigured}`);
            const commandResult: string = this.executeCommand(commandConfigured, path);
            handleResult(commandResult);
        }else{
            log("error", "DevToolsStandardCommand_retrieve: Command is empty or missing the configuration.");
        }
    }

    async deploy(config: DevToolsCommandSetting, args: {[key: string]: any }, path: string, handleResult: (result: any) => void){
        log("info", `Running DevTools Standard Command: Deploy...`);
        if("command" in config && config.command){
            // Gets that metadata types that are supported for deploy
            const supportedMdTypes: SupportedMetadataTypes[] = this.metadataTypes
                .filter((mdType: SupportedMetadataTypes) => mdType.supports.retrieve);

            // Configures the command to replace all the parameters with the values
            const commandConfigured: string | undefined = 
                await this.configureCommandWithParameters(
                    config, 
                    args,
                    supportedMdTypes
                );

            // Checks if the command is still missing so required parameter
            if(this.hasPlaceholders(commandConfigured)){
                log("debug", `Required Parameters missing from Deploy command: ${commandConfigured}`);
                return;
            }

            log("debug", `Deploy Command configured: ${commandConfigured}`);
            const commandResult: string = this.executeCommand(commandConfigured, path);
            handleResult(commandResult);
        }else{
            log("error", "DevToolsStandardCommand_deploy: Command is empty or missing the configuration.");
        }
    }
}

export default DevToolsStandardCommands;