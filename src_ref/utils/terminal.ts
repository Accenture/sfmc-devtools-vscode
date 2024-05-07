import { spawn, spawnSync, SpawnSyncReturns } from "child_process";

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

function executeTerminalCommand(command: string, args: string[], sync: boolean): TerminalOutput {
	return sync ? executeCommandSync(command, args) : executeCommand(command, args);
}

function getGlobalInstalledPackages(): string[] {
	try {
		const terminal: TerminalOutput = executeTerminalCommand("npm", ["list", "-g", "--json"], true);

		if (terminal.error) throw new Error(`Error retrieving global packages: ${terminal.error}`);
		if (!terminal.output.includes('"dependencies"'))
			throw new Error(`Error retrieving global packages: no "dependencies" found.`);

		const terminalOutput: { name: string; dependencies: Record<string, {}> } = JSON.parse(terminal.output);
		return Object.keys(terminalOutput.dependencies || {});
	} catch (error) {
		throw new Error(`Error retrieving global packages: failed to parse JSON output.`);
	}
}

function isPackageInstalled(packageName: string): boolean {
	try {
		const installedPackages: string[] = getGlobalInstalledPackages();
		return installedPackages.includes(packageName);
	} catch (error) {
		throw new Error(`[terminal_isPackageInstalled]: ${error}`);
	}
}

function installPackage(packageName: string): TerminalOutput {
	try {
		const terminal: TerminalOutput = executeTerminalCommand("npm", ["install", "-g", packageName], true);
		return terminal;
	} catch (error) {
		throw new Error(`[terminal_isPackageInstalled]: ${error}`);
	}
	const terminal: TerminalOutput = executeTerminalCommand("npm", ["install", "-g", packageName], true);
	if (terminal.error) return { ...terminal, error: `Error installing '${packageName}' package: ${terminal.error}` };
	return terminal;
}

export const terminal = { isPackageInstalled, installPackage };
