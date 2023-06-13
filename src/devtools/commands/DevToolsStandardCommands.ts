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
            commandResultHandler 
        }: DevToolsCommandRunner = commandRunner;

        log("debug", `Running DevTools Standard Command for id '${commandId}'.`);
        if(commandId in this.commandMethods){
            this.commandMethods[commandId](commandConfig, commandArgs, commandResultHandler);
        }else{
            log("error", `DevTools Standard Command method for id '${commandId}' is not implemented.`);
        }
    }

    setMetadataTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.metadataTypes = mdTypes;
    }

    retrieve(config: DevToolsCommandSetting, args: {[key: string]: any }, handleResult: (result: any) => void){
        log("info", `Running DevTools Standard Command: Retrieve...`);
        console.log(config);
        console.log(args);
    }

    deploy(config: DevToolsCommandSetting, args: {[key: string]: any }, handleResult: (result: any) => void){
        log("info", `Running DevTools Standard Command: Deploy...`);
        console.log(config);
        console.log(args);

    }

//     retrieve(args: {[key: string]: string}){
//         console.log("Standard - Retrieve Method args = ", args);
//         // let [{ command, requiredParams, optionalParams }] = 
//         //     this.commandsConfig.filter(({ id }: { id: string }) => id.toLowerCase() === "retrieve");
//         // if(!command){
//         //     // throw error
//         // }
//         // if(requiredParams && requiredParams.length){
//         //     requiredParams.forEach((param: string) => {
//         //         if(param in args && args[param]){
//         //             command = command.replace(`{{${param}}}`, args[param]);
//         //         }else{
//         //             // request user
//         //             // console.log(this.getSupportedMdTypes());
//         //             // const supportedMdTypes = this.getSupportedMdTypes()
//         //             // .filter(mdType => mdType.supports.retrieve);
//         //         }
//         //     });
//         // }
//         // if(optionalParams && optionalParams){
//         //     optionalParams.forEach((param: string) => {
//         //         command = command.replace(`{{${param}}}`,
//         //         param in args ? args[param] : "");
//         //     });
//         // }
//         // console.log(command);
//         // this.executeCommand(command, true);
//     }

//     deploy(args: {[key: string]: string}){
//         console.log("Standard - Deploy Method args = ", args);
//     }
}

export default DevToolsStandardCommands;