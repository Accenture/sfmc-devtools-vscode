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

function executeCommand(command: string | string[], args: (string | boolean)[]){
    [command]
        .flat()
        .forEach(
            (command: string) => commands.executeCommand(command, ...args)
        );
}

export const editorCommands = {
    registerCommand,
    executeCommand
};