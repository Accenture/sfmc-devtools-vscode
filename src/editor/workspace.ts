import { workspace, Uri } from "vscode";

async function isFileInFolder(filename: string): Promise<boolean> {
    const fileArray: Uri[] = await workspace.findFiles(filename);
    return fileArray.length > 0;
}

export const editorWorkspace = {
    isFileInFolder
};