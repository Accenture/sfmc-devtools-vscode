import * as fs from "fs";
import * as path from 'path';
    
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

function copyFile(files: {sourceFilePath: string, targetFilePath: string}[], handleCopyFileError: (error: any) => void){
    try{
        files.forEach(({sourceFilePath, targetFilePath}: {sourceFilePath: string, targetFilePath: string}) => {
            sourceFilePath = sourceFilePath.replace(/^\/c:/g, "");
            targetFilePath = targetFilePath.replace(/^\/c:/g, "");
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
    copyFile
};