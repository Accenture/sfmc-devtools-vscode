import { execSync } from 'child_process';
import { Terminal, window } from 'vscode';

const DEVTOOLS_TERMINAL_NAME: string = 'sfmc-devtools'; // TODO

export function executeSyncTerminalCommand(command: string): string {
    try {
        return execSync(command)
            .toString()
            .trim();
    }catch(error){
        throw new Error(`Error executing the command: ${command}`);
    }
}

export async function execInWindowTerminal(command: string): Promise<void>{
    const activeDevToolsTerminals: Array<Terminal> = window.terminals.filter(term => term.name === DEVTOOLS_TERMINAL_NAME);
    const devToolsTerminal: Terminal = activeDevToolsTerminals.length ?
        activeDevToolsTerminals[0] : 
        window.createTerminal(DEVTOOLS_TERMINAL_NAME);
    devToolsTerminal.sendText(command);
    devToolsTerminal.show();
}



