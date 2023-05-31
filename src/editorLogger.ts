import { OutputChannel, window } from "vscode";

let info: OutputChannel = undefined;

function mapObject(obj: any) {
    switch (typeof obj) {
        case 'undefined':
            return 'undefined';

        case 'string':
            return obj;

        case 'number':
            return obj.toString;

        case 'object':
            let ret: string = '';
            for (const [key, value] of Object.entries(obj)) {
                ret += (`${key}: ${value}\n`);
            }
            return ret;

        default:
            return obj; //function,symbol,boolean
    }
}

export function log(cat: string, ...o: any) {
    const date: string = new Date().toISOString().replace("T", " ").replace(/\..+/, '');
    if(!info){
        info = window.createOutputChannel("SFMC Devtools");
    }

    info.appendLine(`${date} ${cat.toUpperCase()}: `);
    o.map((args: any) => {
        info.appendLine('' + mapObject(args) + '\n');
    });
    info.show();
    return;
}