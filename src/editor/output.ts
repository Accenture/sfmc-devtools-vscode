import { OutputChannel, window } from "vscode";
import { lib } from "../shared/utils/lib";
import { fileLogger, FileLogger } from "../shared/utils/fileLogger";
enum LogLevel {
    debug = "DEBUG",
    info = "INFO",
    warning = "WARNING",
    error = "ERROR"
}

// DEBUG, WARNING AND ERROR => File logger
// INFO => OutputChannel

let outputChannel: OutputChannel;
let fileLoggerMap: { [key: string]: FileLogger } = {};

function initFileLogger(logPath: string | string[]){
    fileLoggerMap = [logPath]
    .flat()
    .reduce((prev: {}, path: string) => {
        const projectName: string = lib.getProjectNameFromPath(path);
        return {
            ...prev, 
            [projectName]: fileLogger.createFileLogger(path.replace('/c:', ''))
        };
    },{});
}

function showOuputChannel(){
    if(outputChannel){
        outputChannel.show();
    }
}

function log(level: keyof typeof LogLevel, output: string | number | object, logProject?: string){

    const outputStr: string = lib.mapObject(output);
    // creates an output channel
    if(!outputChannel){
        outputChannel = window.createOutputChannel("SFMC Devtools");
        outputChannel.hide();
    }

    if(LogLevel[level] === LogLevel.info || LogLevel[level] === LogLevel.error){
        outputChannel.appendLine(`${outputStr}`);
    }

    if(logProject && logProject in fileLoggerMap){
        const logger: FileLogger = fileLoggerMap[logProject];
        logger[level](outputStr);
    }
}

const editorOutput = {
    initFileLogger,
    showOuputChannel
};

export { log, editorOutput };