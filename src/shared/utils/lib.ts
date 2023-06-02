import path from "path";

function parseArrayJsonStringToArray(jsonStr: string): 
    {[key: string]: string | string[] | {[key: string]: string}} {
    return JSON.parse(jsonStr);
}

function mapObject(object: any): string {
    switch(typeof object){
        case "undefined":
            return "undefined";
        case "string":
            return object;
        case "number":
            return object.toString();
        case "object":
            let ret: string = '';
            for (const [key, value] of Object.entries(object)) {
                ret += (`${key}: ${value}\n`);
            }
            return ret;
        default:
            return object; 
    }
}

function createFilePath(pathArray: string[]): string {
    return path.join(...pathArray);
}



export const lib = {
    parseArrayJsonStringToArray,
    mapObject,
    createFilePath
};