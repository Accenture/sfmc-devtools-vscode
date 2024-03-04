import DevToolsCommands from "./DevToolsCommands";
import DevToolsCommandSetting from "../../shared/interfaces/devToolsCommandSetting";
import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";
import DevToolsCommandRunner from "../../shared/interfaces/devToolsCommandRunner";
import { log } from "../../editor/output";

class DevToolsStandardCommands extends DevToolsCommands {

    private commandMethods: {
        [key: string]: (
            config: DevToolsCommandSetting, 
            args: {[key: string]: string | string[] | boolean },
            path: string,
            commandHandlers: { [key: string]: (args?: any) => void }
        ) => void
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
            commandHandlers 
        }: DevToolsCommandRunner = commandRunner;

        log("debug", `Running DevTools Standard Command for id '${commandId}'.`);
        if(commandId in this.commandMethods){
            this.commandMethods[commandId](commandConfig, commandArgs, commandPath, commandHandlers);
        }else{
            log("error", `DevTools Standard Command method for id '${commandId}' is not implemented.`);
        }
    }

    setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.metadataTypes = mdTypes;
    }
    
    getMetadataTypes(): SupportedMetadataTypes[]{
        return this.metadataTypes;
    }

    getSupportedMetadataTypeByAction(action: string){
        const supportedActions: {[key: string]: () => SupportedMetadataTypes[]} = {
            "retrieve": () => this.getMetadataTypes()
                .filter((mdType: SupportedMetadataTypes) => mdType.supports.retrieve),
            "deploy": () => this.getMetadataTypes()
                .filter((mdType: SupportedMetadataTypes) => mdType.supports.create || mdType.supports.update)
        };
        if(action in supportedActions){
            return supportedActions[action]();
        }
        log(
            "error", 
            `DevToolsStandardCommand_getSupportedMetadataTypeByAction: Failed to retrieve supported Metadata Types for action ${action}.`
        );
        return [];
    }

    async retrieve(
        config: DevToolsCommandSetting, 
        args: {[key: string]: string | string[] | boolean }, 
        path: string, 
        { handleCommandResult, loadingNotification }: { [key: string]: (args?: any) => void }){

        log("info", `Running DevTools Standard Command: Retrieve...`);
        if("command" in config && config.command){
            // Gets that metadata types that are supported for retrieve
            const supportedMdTypes: SupportedMetadataTypes[] = this.getSupportedMetadataTypeByAction("retrieve");
            
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
                handleCommandResult({ success: false,  cancelled: true });
                return;
            }

            log("debug", `Retrieve Command configured: ${commandConfigured}`);
            loadingNotification();
            const commandResult: string | number = await this.executeCommand(commandConfigured, path, true);
            if(typeof(commandResult) === "number"){
                handleCommandResult({ success: commandResult === 0, cancelled: false });
            }
        }else{
            log("error", "DevToolsStandardCommand_retrieve: Command is empty or missing the configuration.");
        }
    }

    async deploy(
        config: DevToolsCommandSetting, 
        args: {[key: string]: string | string[] | boolean }, 
        path: string, 
       { handleCommandResult, loadingNotification }: { [key: string]: (args?: any) => void }){

        log("info", `Running DevTools Standard Command: Deploy...`);
        if("command" in config && config.command){
            // Gets that metadata types that are supported for deploy
            const supportedMdTypes: SupportedMetadataTypes[] = this.getSupportedMetadataTypeByAction("deploy");

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
                handleCommandResult({ success: false,  cancelled: true });
                return;
            }

            log("debug", `Deploy Command configured: ${commandConfigured}`);
            loadingNotification();
            const commandResult: string | number = await this.executeCommand(commandConfigured, path, true);
            if(typeof(commandResult) === "number"){
                handleCommandResult({ success: commandResult === 0, cancelled: false });
            }
        }else{
            log("error", "DevToolsStandardCommand_deploy: Command is empty or missing the configuration.");
        }
    }

    isSupportedMetadataType(action: string, metadataType: string){
        const filteredMdtTypeByAction = this.getSupportedMetadataTypeByAction(action);
        return filteredMdtTypeByAction.some((mdtType: SupportedMetadataTypes) => mdtType.apiName === metadataType);
    }
}

export default DevToolsStandardCommands;