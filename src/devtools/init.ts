import { devtoolsMain } from "./main";
import { devtoolsContainers } from "./containers";
import { log } from "../editor/output";

async function run(){
    try{
        log("info", "Running SFMC DevTools extension...");
        const isDevtoolsProject: boolean = await devtoolsMain.isADevToolsProject();
        
        // Activate status bar option based on if it's a mcd\ev project or not
        devtoolsContainers.activate(isDevtoolsProject);

        // If it's already a mcdev project it will check if prerequisites and devtools are installed
        if(isDevtoolsProject){

        }
    }catch(exception){
        console.error(exception); // TODO
    }
}

export const devtoolsInit = {
    run
};
