import { ExtensionContext } from "vscode";
import { initHelper } from "./helpers/initHelper";
import { noDevToolsHandler } from "./helpers/installHelper";
import { prerequisites } from "./prerequisites";

export async function init(context: ExtensionContext){
    try{
        // Checks if all the prerequesites are installed. If not returns the missing prerequisite name
        const { prerequisitesInstalled, missingPrerequisites} = prerequisites.arePrerequisitesInstalled();

        // if user has prequisites installed
        if(prerequisitesInstalled){
            // const hasDevTools = await prerequisites.isDevToolsInstalled();
            // if(hasDevTools){
            //     // TODO - check if project is already initiated
            //     // initialize devtools
            //     initHelper(context); 
            // }else{
            //     // install devtools
            //     noDevToolsHandler(context);
            // }
        }else{
            // show prequisites installation page
            prerequisites.noPrerequisitesHandler(context.extensionPath, missingPrerequisites);
        }
    }catch(exception){
        console.error(exception); // TODO
    }
}
