import { spawn, spawnSync, SpawnSyncReturns } from "child_process";
import { TUtils } from "@types";
import { Lib } from "utils";

/**
 * Executes a terminal command synchronously
 *
 * @param {TUtils.ITerminalCommandRunner} param.command - terminal command
 * @param {TUtils.ITerminalCommandRunner} param.commandArgs - terminal arguments
 * @param {TUtils.ITerminalCommandRunner} param.commandCwd - terminal working directory path
 * @returns {TUtils.ITerminalCommandResult} object configured with the result of executing the terminal command
 */
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

/**
 * Executes a terminal command asynchronously
 *
 * @param {TUtils.ITerminalCommandRunner} param.command - terminal command
 * @param {TUtils.ITerminalCommandRunner} param.commandArgs - terminal arguments
 * @param {TUtils.ITerminalCommandRunner} param.commandCwd - terminal working directory path
 * @param {TUtils.ITerminalCommandRunner} param.commandHandler - terminal handler function
 * @returns {Promise<TUtils.ITerminalCommandResult>} object configured with the result of executing the terminal command
 */
function executeCommand({
	command,
	commandArgs,
	commandCwd,
	commandHandler
}: TUtils.ITerminalCommandRunner): Promise<TUtils.ITerminalCommandResult> {
	return new Promise(resolve => {
		const terminalOutput: TUtils.ITerminalCommandStreams = { output: "", error: "" };
		const proccess = spawn(command, commandArgs, { shell: true, cwd: commandCwd });

		if (proccess.stdout && commandHandler)
			proccess.stdout.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, output: data.toString().trim() })
			);
		if (proccess.stderr && commandHandler)
			proccess.stderr.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, error: data.toString().trim() })
			);

		proccess.on("close", code => resolve({ success: code === 0, stdStreams: terminalOutput }));
	});
}

/**
 * Executes terminal command either synchronously or asynchronously
 *
 * @param {TUtils.ITerminalCommandRunner} param.command - terminal command
 * @param {TUtils.ITerminalCommandRunner} param.commandArgs - terminal arguments
 * @param {TUtils.ITerminalCommandRunner} param.commandCwd - terminal working directory path
 * @param {TUtils.ITerminalCommandRunner} param.commandHandler - terminal handler function
 * @param {boolean} sync - true if command should run synchronously false otherwise
 * @returns {(TUtils.ITerminalCommandResult | Promise<TUtils.ITerminalCommandResult>)} object configured with the result of executing the terminal command in an sync or async way
 */
function executeTerminalCommand(
	{ command, commandArgs, commandCwd, commandHandler }: TUtils.ITerminalCommandRunner,
	sync: boolean
): TUtils.ITerminalCommandResult | Promise<TUtils.ITerminalCommandResult> {
	if (commandCwd) commandCwd = Lib.removeLeadingRootDrivePath(commandCwd);
	return sync
		? executeCommandSync({ command, commandArgs, commandCwd })
		: executeCommand({ command, commandArgs, commandCwd, commandHandler });
}

/**
 * Gets a list of the globally installed packages
 *
 * @returns {string[]} list of the installed packages names
 */
function getGlobalInstalledPackages(): string[] {
	try {
		const commandArgs: TUtils.ITerminalCommandRunner = { command: "npm", commandArgs: ["list", "-g", "--json"] };
		const terminal = <TUtils.ITerminalCommandResult>executeTerminalCommand(commandArgs, true);

		if (terminal.stdStreams.error)
			throw new Error(
				`[terminal_globalInstalledPackages]: Retrieving global packages: ${terminal.stdStreams.error}`
			);
		if (!terminal.stdStreams.output.includes('"dependencies"'))
			throw new Error(`[terminal_globalInstalledPackages]: Retrieving global packages: no "dependencies" found.`);

		const terminalOutput: { name: string; dependencies: Record<string, unknown> } = JSON.parse(
			terminal.stdStreams.output
		);
		return Object.keys(terminalOutput.dependencies || {});
	} catch (error) {
		throw error;
	}
}

/**
 * Checks if a package is installed globally
 *
 * @param {string} packageName - name of the package
 * @returns {boolean} true if package is installed globally false otherwise
 */
function isPackageInstalled(packageName: string): boolean {
	const installedPackages = getGlobalInstalledPackages();
	return installedPackages.includes(packageName);
}

/**
 * Installs a package globally in the computer
 *
 * @param {string} packageName - package name
 * @returns {TUtils.ITerminalCommandResult} object configured with the result of executing the terminal command
 */
function installPackage(packageName: string): TUtils.ITerminalCommandResult {
	const commandArgs: TUtils.ITerminalCommandRunner = {
		command: "npm",
		commandArgs: ["install", "-g", packageName]
	};
	const terminal = <TUtils.ITerminalCommandResult>executeTerminalCommand(commandArgs, true);
	return terminal;
}

export { executeTerminalCommand, isPackageInstalled, installPackage };
