import { commands } from "vscode";

interface CommandRegister {
    command: string,
    callbackAction: () => void
}
function registerCommand(register: CommandRegister | CommandRegister[]): void {
    [register]
        .flat()
        .forEach(
            (registry) => commands.registerCommand(registry.command, registry.callbackAction)
        );
}

function executeCommand(command: string | string[]){
    [command]
        .flat()
        .forEach(
            (command: string) => commands.executeCommand(command)
        );
}

export const editorCommands = {
    registerCommand,
    executeCommand
};