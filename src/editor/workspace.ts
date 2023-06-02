import { workspace, Uri, TextDocument } from "vscode";
import { editorCommands } from "./commands";

async function isFileInFolder(filename: string): Promise<boolean> {
    const fileArray: Uri[] = await workspace.findFiles(filename);
    return fileArray.length > 0;
}

async function readFile(path: string): Promise<string>{
    const document: TextDocument = await workspace.openTextDocument(path);
    return document.getText();
}

function reloadWorkspace(){
    editorCommands.executeCommand("workbench.action.reloadWindow");
}

export const editorWorkspace = {
    isFileInFolder,
    readFile,
    reloadWorkspace
};