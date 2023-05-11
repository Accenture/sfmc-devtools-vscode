import { ChildProcess, exec } from 'child_process';
import { Terminal, TextDocument, Uri, window, workspace } from 'vscode';

const DEVTOOLS_TERMINAL_NAME: string = 'sfmc-devtools';

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

export async function readFile(filename: string): Promise<string>{
    const [{ uri }] = workspace.workspaceFolders;
    if(Object.keys(uri).includes("path")){
        const document: TextDocument = await workspace.openTextDocument(`${uri.path}/${filename}`);
        return document.getText();
    }
    return '';
}

export async function isFileInFolder(filename: string): Promise<boolean> {
    const fileArray: Array<Uri> = await workspace.findFiles(filename);
    return fileArray.length > 0;
}