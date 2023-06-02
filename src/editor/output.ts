import { OutputChannel, window } from "vscode";
import { lib } from "../shared/utils/lib";

enum LogLevel {
    debug = "DEBUG",
    info = "INFO",
    warning = "WARNING",
    error = "ERROR"
}

let outputChannel: OutputChannel;

function log(level: keyof typeof LogLevel, ...output: any){

    // creates an output channel
    if(!outputChannel){
        outputChannel = window.createOutputChannel("SFMC Devtools");
    }

    const date: string = new Date()
        .toISOString()
        .replace("T", " ").replace(/\..+/, '');

    outputChannel.appendLine(`${date} ${LogLevel[level]}: `);
    output.map((args: any) => {
        outputChannel.appendLine('' + lib.mapObject(args) + '\n');
    });
    outputChannel.show();
}
export { log };