import { ProgressLocation, window } from "vscode";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";

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

async function handleShowInformationMessage(message: string, actions: string[]): Promise<string | undefined> {
    const response: string | undefined = await window.showInformationMessage(message, ...actions);
    return response;
}

async function handleInProgressMessage(local: string, reportMessage: string, callbackFn: () => void ){
    await window.withProgress({ location: ProgressLocation[local as keyof typeof ProgressLocation]},
        async(progress) => {
            progress.report({ message: reportMessage });
            callbackFn();
        }
    );
}

export const editorInput = {
    handleQuickPickSelection,
    handleShowInformationMessage,
    handleInProgressMessage
};