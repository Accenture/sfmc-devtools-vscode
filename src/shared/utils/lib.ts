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

function capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function waitTime(timeInMs: number, handleFn: () => void){
    setTimeout(() => handleFn(), timeInMs);
}

function getProjectNameFromPath(projectPath: string): string {
    const projectName : string | undefined = projectPath.split("/").pop();
    if(!projectName){
        throw new Error(`[lib_getProjectNameFromPath]: Failed to retrieve last folder name from path: ${projectPath}`);
    }
    return projectName;
}

function removeDuplicates(array: (string | number)[]): (string | number)[] {
    return [...new Set(array)];
}

function removeNonValues(array: (string | number)[]): (string | number)[]{
    return array
    .filter(
        (value: string | number) => (value !== undefined && value !== null && value !== "")
    );
}

function removeExtensionFromFile(files: string | string[]): string[] {
    return [files]
        .flat()
        .map((file: string) => {
            const filePathSplit: string[] = file.split("/");
            let fileName: string | undefined = filePathSplit.pop();
            if(fileName){
                fileName = fileName.startsWith(".")
                ? `.${fileName.substring(1).split(".")[0]}`
                : fileName.split(".")[0];
                filePathSplit.push(fileName);
            }else{
                throw Error(`[lib_removeExtensionFromFile]: Failed to get filename for file ${file}`);
            }
            return filePathSplit.join("/");
        });
}

export const lib = {
    parseArrayJsonStringToArray,
    mapObject,
    createFilePath,
    capitalizeFirstLetter,
    waitTime,
    getProjectNameFromPath,
    removeDuplicates,
    removeNonValues,
    removeExtensionFromFile
};