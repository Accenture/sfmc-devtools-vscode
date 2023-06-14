import { execSync } from 'child_process';
import { log } from '../../editor/output';

export function executeSyncTerminalCommand(command: string, path: string): string {
    try {
        path = path.startsWith("/c:") ? path.replace("/c:", "") : path;
        return execSync(command, { cwd: path })
            .toString()
            .trim();
    }catch(error){
        log("error", `terminal_executeSyncTerminalCommand: ${error}`);
        throw new Error(`Error executing the command: ${command}`);
    }
}



