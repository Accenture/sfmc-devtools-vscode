import { workspace, Uri, TextDocument, WorkspaceFolder, FileType } from "vscode";
import { editorCommands } from "./commands";

function getWorkspaceURI(): Uri {
    const wsFolder: readonly WorkspaceFolder[] | undefined = workspace.workspaceFolders;
    if(wsFolder){
        const [{ uri }] = wsFolder;
        return uri;
    }else{
        throw new Error("Could not get Workspace Folder.");
    }
}
function getWorkspaceURIPath(): string {
    const wsURI: Uri = getWorkspaceURI();
    if(wsURI && "path" in wsURI){
        return wsURI.path;
    }
    throw new Error("Failed to find Worspace Uri PATH.");
}

async function getWorkspaceSubFolders(): Promise<string[]>{
    const wsURI: Uri = getWorkspaceURI();
    const subFolders = await workspace.fs.readDirectory(wsURI);
    return subFolders.map(([folderName]: [string, FileType]) => folderName);
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
    editorCommands.executeCommand("workbench.action.reloadWindow", []);
}

export const editorWorkspace = {
    isFileInFolder,
    readFile,
    reloadWorkspace,
    getWorkspaceURIPath,
    getWorkspaceSubFolders
};