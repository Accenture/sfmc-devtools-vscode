export function parseArrayJsonStringToArray(jsonStr: string): {[key: string]: string | string[] | {[key: string]: string}} {
    return JSON.parse(jsonStr);
}