import { window } from "vscode";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";

async function handleQuickPickSelection(
    optionsList: Array<InputOptionsSettings>, 
    placeHolder: string, 
    canPickMany: boolean): Promise<InputOptionsSettings | undefined > {
    const selectedOption = await window.showQuickPick(
        optionsList, 
        { placeHolder: placeHolder, canPickMany: canPickMany, ignoreFocusOut: true }
    );
    return selectedOption;
}
async function handleShowInformationMessage(message: string, actions: string[]){
    const response: string | undefined = await window.showInformationMessage(message, ...actions);
    return response;
}

export const editorInput = {
    handleQuickPickSelection,
    handleShowInformationMessage
};