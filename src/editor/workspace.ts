import { workspace, Uri, TextDocument, WorkspaceFolder } from "vscode";
import { editorCommands } from "./commands";

function getWorkspaceURIPath(): string {
    const wsFolder: readonly WorkspaceFolder[] | undefined = workspace.workspaceFolders;
    if(wsFolder){
        const [{ uri }] = wsFolder;
        if(uri && "path" in uri){
            return uri.path;
        }
        throw new Error("Failed to find Worspace Uri PATH.");
    }else{
        throw new Error("Could not get Workspace Folder.");
    }
}

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
    reloadWorkspace,
    getWorkspaceURIPath
};