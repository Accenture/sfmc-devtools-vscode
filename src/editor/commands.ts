import { commands } from "vscode";

interface CommandRegister {
    command: string,
    callbackAction: (reg: { path: string }) => void
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
            (command: string) => commands.executeCommand(command, ...args)
        );
}

function setCommandContext(command: string | string[], args: (string | boolean | number)[]){
    [command]
        .flat()
        .forEach(
            (command: string) => commands.executeCommand('setContext', command, args)
        );
}

export const editorCommands = {
    registerCommand,
    executeCommand,
    setCommandContext
};