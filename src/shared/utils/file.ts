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

function copyFile(files: {sourceFilePath: string, targetFilePath: string}[], handleCopyFileError: (error: any) => void){
    try{
        files.forEach(({sourceFilePath, targetFilePath}: {sourceFilePath: string, targetFilePath: string}) => {
            sourceFilePath = sourceFilePath.replace(/^\/[a-zA-Z]:/g, "");
            targetFilePath = targetFilePath.replace(/^\/[a-zA-Z]:/g, "");
            fs.cp(
                sourceFilePath, 
                targetFilePath, 
                {recursive: true}, 
                (err) => handleCopyFileError(err)
            );
        });
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