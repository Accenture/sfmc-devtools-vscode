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

export const file = {
    createFilePath,
    readFileSync
};