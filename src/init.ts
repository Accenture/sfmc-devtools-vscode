import { ExtensionContext } from "vscode";
import { initHelper } from "./initHelper";
import { noDevToolsHandler, noPrerequisitesHandler } from "./installHelper";
import { arePreRequisitesInstalled, isDevToolsInstalled } from './prerequisites';
import { log } from "./editorLogger";

export async function init(context: ExtensionContext){
    try{
        log("info", "Initializing SFMC Devtools extension v0.0.1 ...");
        const hasPrerequisites = await arePreRequisitesInstalled(null);
        console.log("HasPrerequisites = ", hasPrerequisites);
        // if user has prequisites installed
        if(hasPrerequisites){
            log("info", "Pre requesites are installed.");
            const hasDevTools = await isDevToolsInstalled();
            console.log("hasDevTools = ", hasDevTools);
            if(hasDevTools){
                log("info", "Initialize DevTools project...");
                // TODO - check if project is already initiated
                // initialize devtools
                initHelper(context); 
            }else{
                log("info", "Request to install DevTools...");
                // install devtools
                noDevToolsHandler(context);
            }
        }else{
            log("info", "Pre requesites are NOT installed.");
            // show prequisites installation page
            noPrerequisitesHandler(context);
        }
    }catch(exception){
        console.error(exception);
    }
}
