import { spawn, ChildProcess, spawnSync, SpawnSyncReturns } from "child_process";

type TerminalOutput = { output: string; error: string; code?: number };

function executeCommandSync(command: string, args: string[]): TerminalOutput {
	const terminal: SpawnSyncReturns<Buffer> = spawnSync(command, args, { shell: true });
	return {
		output: terminal.stdout.toString().trim(),
		error: terminal.stderr.toString().trim()
	};
}

function executeCommand(command: string, args: string[]) {
	let terminalOutput: TerminalOutput = { output: "", error: "", code: 0 };
	spawn(command, args, { shell: true });
	return terminalOutput;
}

function executeTerminalCommand(command: string, args: string[], sync: boolean) {
	const terminalProcess: TerminalOutput = sync ? executeCommandSync(command, args) : executeCommand(command, args);
	console.log(terminalProcess);
	return terminalProcess;
}

async function getGlobalInstalledPackages(): Promise<string[]> {
	const terminal: TerminalOutput = executeTerminalCommand("npm", ["list", "-g", "--json"], true);

	return [];
}

function isPackageInstalled(packageName: string): boolean {
	try {
		const installedPackages: string[] = getGlobalInstalledPackages();
		return installedPackages.includes(packageName);
	} catch (error) {
		console.log(`${error}`);
		return false;
	}
}

export const terminal = { isPackageInstalled };
