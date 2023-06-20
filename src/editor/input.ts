import { Progress, ProgressLocation, window } from "vscode";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";

enum NotificationMessage {
    info,
    warning,
    error
};

async function handleQuickPickSelection(
    optionsList: InputOptionsSettings[], 
    placeHolder: string, 
    canPickMany: boolean): Promise<InputOptionsSettings | InputOptionsSettings[] | undefined > {
    const selectedOption: InputOptionsSettings | InputOptionsSettings[] | undefined = await window.showQuickPick(
        optionsList, 
        { placeHolder: placeHolder, canPickMany: canPickMany, ignoreFocusOut: true }
    );
    return selectedOption;
}

async function handleShowOptionsMessage(message: string, actions: string[]): Promise<string | undefined> {
    const response: string | undefined = await window.showInformationMessage(message, ...actions);
    return response;
}

async function handleShowInputBox(placeHolder: string): Promise<string | undefined> {
    const response: string | undefined = await window.showInputBox({ placeHolder, ignoreFocusOut: true});
    return response;
}

async function handleInProgressMessage(local: string, callbackFn: (progress: Progress<{message: string, increment?: number}>) => Promise<void> ){
    await window.withProgress({ location: ProgressLocation[local as keyof typeof ProgressLocation]},
        async(progress) => callbackFn(progress)
    );
}

function handleShowNotificationMessage(level: keyof typeof NotificationMessage, message: string){
    switch(level){
        case "info":
            window.showInformationMessage(message);
            break;
        case "warning":
            window.showWarningMessage(message);
            break;
        case "error":
            window.showErrorMessage(message);
            break;
        default:
            window.showInformationMessage(message);
    }
}

export const editorInput = {
    handleQuickPickSelection,
    handleShowOptionsMessage,
    handleInProgressMessage,
    handleShowInputBox,
    handleShowNotificationMessage
};