import { Uri, workspace } from 'vscode';
import * as fs from "fs";
import * as path from 'path';

// export async function readFile(filename: string): Promise<string>{
//     const [{ uri }] = workspace.workspaceFolders;
//     if(Object.keys(uri).includes("path")){
//         const document: TextDocument = await workspace.openTextDocument(`${uri.path}/${filename}`);
//         return document.getText();
//     }
//     return '';
// }

export async function isFileInFolder(filename: string): Promise<boolean> {
    const fileArray: Array<Uri> = await workspace.findFiles(filename);
    return fileArray.length > 0;
}

function readFileSync(path: string): string {
    try{
        return fs.readFileSync(path, "utf-8");
    }catch(error){
        throw error;
    }
}

function createFilePath(pathArray: string[]): string {
    return path.join(...pathArray);
}

export const file = {
    createFilePath,
    readFileSync
};