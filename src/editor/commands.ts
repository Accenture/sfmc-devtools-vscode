import { commands, Uri } from "vscode";

interface CommandRegister {
    command: string,
    callbackAction: (file: Uri, files: Uri[]) => void
}
function registerCommand(register: CommandRegister | CommandRegister[]): void {
    [register]
        .flat()
        .forEach(
            (registry) => commands.registerCommand(registry.command, registry.callbackAction)
        );
}

function executeCommand(command: string | string[], args: (string | boolean | string[])[]){
    [command]
        .flat()
        .forEach(
            async (command: string) => await commands.executeCommand(command, ...args)
        );
}

function setCommandContext(command: string | string[], args: (string | boolean | number)[]){
    [command]
        .flat()
        .forEach(
            (command: string) => commands.executeCommand('setContext', command, args)
        );
}

const editorCommands = {
    registerCommand,
    executeCommand,
    setCommandContext
};
export { Uri, editorCommands };

