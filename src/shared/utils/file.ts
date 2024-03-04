import * as fs from "fs";
import * as path from 'path';
    
function readFileSync(path: string): string {
    try{
        return fs.readFileSync(path, "utf-8");
    }catch(error){
        throw error;
    }
}

function fileExists(path: string | string[]): string[] {
    try{
        return [path]
        .flat()
        .filter((path: string) => fs.existsSync(path.replace(/^\/[a-zA-Z]:/g, "")));
    }catch(error){
        throw error;
    }
}

function isPathADirectory(path: string): boolean {
    try{
        return fs.lstatSync(path.replace(/^\/[a-zA-Z]:/g, "")).isDirectory();
    }catch(error){
        throw error;
    }
}

function createFilePath(pathArray: string[]): string {
    return path.join(...pathArray);
}

async function copyFile(files: {sourceFilePath: string, targetFilePath: string}[], handleCopyFileError: (error: any) => void): Promise<string[]>{
    try{
        const copiedFiles: Promise<string>[] = files.map(async ({sourceFilePath, targetFilePath}: {sourceFilePath: string, targetFilePath: string}) => {
            const noDriveLetterSourceFilePath: string = sourceFilePath.replace(/^\/[a-zA-Z]:/g, "");
            const noDriveLetterTargetFilePath: string = targetFilePath.replace(/^\/[a-zA-Z]:/g, "");
            return new Promise<string>(resolve => fs.cp(
                noDriveLetterSourceFilePath, 
                noDriveLetterTargetFilePath, 
                {recursive: true}, 
                (err) => err ? handleCopyFileError(err) : resolve(targetFilePath)
            ));
        });
        return await Promise.all(copiedFiles);
    }catch(error){
        throw error;
    }
}

export const file = {
    createFilePath,
    readFileSync,
    copyFile,
    fileExists,
    isPathADirectory
};