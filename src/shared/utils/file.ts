import { TextDocument, Uri, workspace } from 'vscode';

export async function readFile(filename: string): Promise<string>{
    const [{ uri }] = workspace.workspaceFolders;
    if(Object.keys(uri).includes("path")){
        const document: TextDocument = await workspace.openTextDocument(`${uri.path}/${filename}`);
        return document.getText();
    }
    return '';
}

export async function isFileInFolder(filename: string): Promise<boolean> {
    const fileArray: Array<Uri> = await workspace.findFiles(filename);
    return fileArray.length > 0;
}