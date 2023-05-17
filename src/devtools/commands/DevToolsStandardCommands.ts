import SupportedMetadataTypes from "../../shared/interfaces/supportedMetadataTypes";
import DevToolsCommands from "./DevToolsCommands";

class DevToolsStandardCommands extends DevToolsCommands {

    private readonly type: string = "standard";
    private supportedMdTypes: SupportedMetadataTypes[];
    private commandsConfig;
    private commandsList: { [key: string]: (...args: any) => void; } = {
        retrieve: this.retrieve.bind(this),
        deploy: this.deploy.bind(this)
    };

    constructor(){
        super();
        this.commandsConfig = DevToolsCommands.getCommandsListByType(this.type);
        this.supportedMdTypes = [];
    }
    
    getCommand(id: string):  () => void {
        return this.commandsList[id];
    }

    run(id: string, args: {[key: string]: string}): void {
        this.runDTCommand(this.getCommand(id), args);
    }

    setSupportedMdTypes(mdTypes: SupportedMetadataTypes[]): void {
        this.supportedMdTypes = mdTypes;
    };

    getSupportedMdTypes(): {}[] {
        return this.supportedMdTypes;
    };

    retrieve(args: {[key: string]: string}){
        console.log("Standard - Retrieve Method args = ", args);
        let [{ command, requiredParams, optionalParams }] = 
            this.commandsConfig.filter(({ id }: { id: string }) => id.toLowerCase() === "retrieve");
        if(!command){
            // throw error
        }
        if(requiredParams && requiredParams.length){
            requiredParams.forEach((param: string) => {
                if(param in args && args[param]){
                    command = command.replace(`{{${param}}}`, args[param]);
                }else{
                    // request user
                    console.log(this.getSupportedMdTypes());
                    const supportedMdTypes = this.getSupportedMdTypes()
                    .filter(mdType => mdType.supports.retrieve);
                }
            });
        }
        if(optionalParams && optionalParams){
            optionalParams.forEach((param: string) => {
                command = command.replace(`{{${param}}}`,
                param in args ? args[param] : "");
            });
        }
        console.log(command);
        this.executeCommand(command, true);
    }

    deploy(args: {[key: string]: string}){
        console.log("Standard - Deploy Method args = ", args);
    }


}

export default DevToolsStandardCommands;