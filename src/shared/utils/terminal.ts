import { ChildProcess, spawn } from 'child_process';
import TerminalCommandRunner from '../interfaces/terminalCommandRunner';

function executeTerminalCommand(commandRunner: TerminalCommandRunner): void {
    const childProcess: ChildProcess = spawn(
        commandRunner.command,
        commandRunner.args,
        {
            shell: true,
            cwd: commandRunner.cwd.replace("/c:", "")
        }
    );

    if(childProcess.stdout){ 
        childProcess.stdout.on('data', (data: Buffer) => commandRunner.handleResult(null, data.toString().trim(), null)); 
    }

    if(childProcess.stderr){
        childProcess.stderr.on('data', (data: Buffer) => commandRunner.handleResult(data.toString().trim(), null, null));
    }

    childProcess.on("exit", (code: number) => commandRunner.handleResult(null, null, code));
}

export const terminal = {
    executeTerminalCommand
};