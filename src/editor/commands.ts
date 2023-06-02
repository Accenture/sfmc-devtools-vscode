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

export const editorCommands = {
    registerCommand
};