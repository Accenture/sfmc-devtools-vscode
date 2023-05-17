import { window } from "vscode";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";

async function handleQuickPickSelection(
    optionsList: Array<InputOptionsSettings>, 
    placeHolder: string, 
    canPickMany: boolean): Promise<InputOptionsSettings> {
    const selectedOption = await window.showQuickPick(
        optionsList, 
        { placeHolder: placeHolder, canPickMany: canPickMany, ignoreFocusOut: true }
    );
    return selectedOption;
}

export const editorInput = {
    handleQuickPickSelection
};