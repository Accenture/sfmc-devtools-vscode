import { execInTerminal } from './utils';
import { log } from './editorLogger';
const PREREQUISITES: { [key: string]: { cmdVersion: string, isValidVersion: (version: string) => RegExpMatchArray } } = {
    node: {
        cmdVersion: 'node --version',
        isValidVersion: (version: string) => version.match(/v\d*.\d*.\d*/)
    },
    git: {
        cmdVersion: 'git --version',
        isValidVersion: (version: string) => version.match(/git version \d*.\d*.\d*.*/)
    }
};

async function arePreRequisitesInstalled(command: string): Promise<boolean>{
    let prerequisitesList: Array<boolean> = [];
    if(!command){
        prerequisitesList = await Promise.all(Object.keys(PREREQUISITES).map(async (res) => {
            const result: string = await execInTerminal(PREREQUISITES[res].cmdVersion);
            log("info", `${res} is ${
                PREREQUISITES[res].isValidVersion(result) !== null ?
                `installed. Version: ${result}`: 'not installed'
            }`);
            return PREREQUISITES[res].isValidVersion(result) !== null;
        }));
    }else{
        let result: string = await execInTerminal(PREREQUISITES[command].cmdVersion);
        prerequisitesList.push(PREREQUISITES[command].isValidVersion(result) !== null);
        log("info", `${command} is ${
            PREREQUISITES[command].isValidVersion(result) !== null ?
            'installed': 'not installed'
        }`);
    }
    return prerequisitesList.every((res: boolean) => res === true);
};

async function isDevToolsInstalled(): Promise<boolean> {
    const result: string = await execInTerminal('mcdev --version');
    log("info", `Devtools is ${
        result.match(/\d*.\d*.\d*/) !== null ?
        `installed. Version: ${result}`: 'not installed.'
    }`);
    return result.match(/\d*.\d*.\d*/) !== null;
}

export {
    arePreRequisitesInstalled,
    isDevToolsInstalled
};