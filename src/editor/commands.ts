import { commands, Uri } from "vscode";

interface CommandRegister {
    command: string,
    callbackAction: (file: Uri, ...files: Uri[][]) => void
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

const editorCommands = {
    registerCommand,
    executeCommand
};

export { Uri, editorCommands };