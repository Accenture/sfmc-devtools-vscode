import { Progress, ProgressLocation, window } from "vscode";
import { editorOutput } from "./output";
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

function handleShowNotificationMessage(level: keyof typeof NotificationMessage, message: string, actions: string[]){
    type NotificationLevelFunctions = {
        [key in keyof typeof NotificationMessage]: (message: string, actions: string[]) => Thenable<string | undefined>;
    };

    const defaultActions: string[] = ["More Details", "Close"];

    const notificationLevelFunctions: NotificationLevelFunctions = {
        info: (message: string, actions: string[]) => window.showInformationMessage(message, ...actions, ...defaultActions),
        warning: (message: string, actions: string[]) => window.showWarningMessage(message, ...actions, ...defaultActions),
        error: (message: string, actions: string[]) => window.showErrorMessage(message, ...actions, ...defaultActions),
    };
    
    const callNotificationFunction = notificationLevelFunctions[level];
    
    callNotificationFunction(message, actions)
    .then((response: string | undefined) => {
        if(response === "More Details"){
            editorOutput.showOuputChannel();
        }
    });
}

export const editorInput = {
    handleQuickPickSelection,
    handleShowOptionsMessage,
    handleInProgressMessage,
    handleShowInputBox,
    handleShowNotificationMessage
};