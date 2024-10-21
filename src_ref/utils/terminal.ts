import { ChildProcess, spawn, spawnSync, SpawnSyncReturns } from "child_process";
import { removeLeadingDrivePath } from "./lib";
import { TUtils } from "@types";

function executeCommandSync({
	command,
	commandArgs,
	commandCwd
}: TUtils.ITerminalCommandRunner): TUtils.ITerminalCommandResult {
	const terminal = <SpawnSyncReturns<Buffer>>spawnSync(command, commandArgs, { shell: true, cwd: commandCwd });
	return {
		success: terminal.status === 0,
		stdStreams: { output: terminal.stdout.toString().trim(), error: terminal.stderr.toString().trim() }
	};
}

function executeCommand({
	command,
	commandArgs,
	commandCwd,
	commandHandler
}: TUtils.ITerminalCommandRunner): Promise<TUtils.ITerminalCommandResult> {
	return new Promise(resolve => {
		const terminalOutput: TUtils.ITerminalCommandStreams = { output: "", error: "" };
		const proccess: ChildProcess = spawn(command, commandArgs, { shell: true, cwd: commandCwd });

		if (proccess.stdout && commandHandler)
			proccess.stdout.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, output: data.toString().trim() })
			);
		if (proccess.stderr && commandHandler)
			proccess.stderr.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, error: data.toString().trim() })
			);

		proccess.on("close", (code: number | null) => resolve({ success: code === 0, stdStreams: terminalOutput }));
	});
}

function executeTerminalCommand(
	{ command, commandArgs, commandCwd, commandHandler }: TUtils.ITerminalCommandRunner,
	sync: boolean
): TUtils.ITerminalCommandResult | Promise<TUtils.ITerminalCommandResult> {
	if (commandCwd) commandCwd = removeLeadingDrivePath(commandCwd);
	return sync
		? executeCommandSync({ command, commandArgs, commandCwd })
		: executeCommand({ command, commandArgs, commandCwd, commandHandler });
}

function getGlobalInstalledPackages(): string[] {
	try {
		const commandArgs: TUtils.ITerminalCommandRunner = { command: "npm", commandArgs: ["list", "-g", "--json"] };
		const terminal = <TUtils.ITerminalCommandResult>executeTerminalCommand(commandArgs, true);

		if (terminal.stdStreams.error)
			throw new Error(`Error retrieving global packages: ${terminal.stdStreams.error}`);
		if (!terminal.stdStreams.output.includes('"dependencies"'))
			throw new Error(`Error retrieving global packages: no "dependencies" found.`);

		const terminalOutput: { name: string; dependencies: Record<string, unknown> } = JSON.parse(
			terminal.stdStreams.output
		);
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

function installPackage(packageName: string): TUtils.ITerminalCommandResult {
	try {
		const commandArgs: TUtils.ITerminalCommandRunner = {
			command: "npm",
			commandArgs: ["install", "-g", packageName]
		};
		const terminal = <TUtils.ITerminalCommandResult>executeTerminalCommand(commandArgs, true);
		return terminal;
	} catch (error) {
		throw new Error(`[terminal_isPackageInstalled]: ${error}`);
	}
}

export const terminal = { executeTerminalCommand, isPackageInstalled, installPackage };
