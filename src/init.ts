import { ExtensionContext } from "vscode";
import { initHelper } from "./initHelper";
import { noDevToolsHandler, noPrerequisitesHandler } from "./installHelper";
import { arePreRequisitesInstalled, isDevToolsInstalled } from './prerequisites';

export async function init(context: ExtensionContext){
    try{
        const hasPrerequisites = await arePreRequisitesInstalled(null);
        // if user has prequisites installed
        if(hasPrerequisites){
            const hasDevTools = await isDevToolsInstalled();
            if(hasDevTools){
                // TODO - check if project is already initiated
                // initialize devtools
                initHelper(context); 
            }else{
                // install devtools
                noDevToolsHandler(context);
            }
        }else{
            // show prequisites installation page
            noPrerequisitesHandler(context);
        }
    }catch(exception){
        console.error(exception);
    }
}
