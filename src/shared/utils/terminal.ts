import { ChildProcess, exec } from 'child_process';
import { Terminal, window } from 'vscode';

const DEVTOOLS_TERMINAL_NAME: string = 'sfmc-devtools'; // TODO

export async function execInTerminal(command: string): Promise<string>{
    return new Promise((resolve) => {
        let result: string = '';
        const process: ChildProcess = exec(command);
        process.stdout.on('data', (data) => result = data);
        process.on('close', () => resolve(result));
    });
}

export async function execInWindowTerminal(command: string): Promise<void>{
    const activeDevToolsTerminals: Array<Terminal> = window.terminals.filter(term => term.name === DEVTOOLS_TERMINAL_NAME);
    const devToolsTerminal: Terminal = activeDevToolsTerminals.length ?
        activeDevToolsTerminals[0] : 
        window.createTerminal(DEVTOOLS_TERMINAL_NAME);
    devToolsTerminal.sendText(command);
    devToolsTerminal.show();
}



