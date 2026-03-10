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
 * Kills a spawned process and its entire process tree.
 * On Windows, uses `taskkill /T /F` to terminate the tree.
 * On Unix/macOS, kills the process group (requires the process to have been
 * spawned with `detached: true` so it becomes a process-group leader).
 *
 * @param {ReturnType<typeof spawn>} proc - the spawned child process
 */
function killProcessTree(proc: ReturnType<typeof spawn>): void {
	try {
		if (process.platform === "win32") {
			spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"]);
		} else if (proc.pid !== undefined) {
			process.kill(-proc.pid, "SIGTERM");
		}
	} catch {
		// Fall back to killing just the shell process if group-kill fails
		proc.kill();
	}
}

/**
 * Executes a terminal command asynchronously
 *
 * @param {TUtils.ITerminalCommandRunner} param.command - terminal command
 * @param {TUtils.ITerminalCommandRunner} param.commandArgs - terminal arguments
 * @param {TUtils.ITerminalCommandRunner} param.commandCwd - terminal working directory path
 * @param {TUtils.ITerminalCommandRunner} param.commandHandler - terminal handler function
 * @param {TUtils.ITerminalCommandRunner} param.cancellationToken - optional token to cancel the running process
 * @returns {Promise<TUtils.ITerminalCommandResult>} object configured with the result of executing the terminal command
 */
function executeCommand({
	command,
	commandArgs,
	commandCwd,
	commandHandler,
	cancellationToken
}: TUtils.ITerminalCommandRunner): Promise<TUtils.ITerminalCommandResult> {
	return new Promise(resolve => {
		let resolved = false;
		const terminalOutput: TUtils.ITerminalCommandStreams = { output: "", error: "" };
		// detached: true on Unix makes the shell a process-group leader so we can
		// kill the entire group (shell + mcdev child) via process.kill(-pid, signal).
		const proc = spawn(command, commandArgs, {
			shell: true,
			cwd: commandCwd,
			detached: process.platform !== "win32"
		});

		if (cancellationToken) {
			cancellationToken.onCancellationRequested(() => {
				if (!resolved) {
					resolved = true;
					killProcessTree(proc);
					resolve({ success: false, stdStreams: terminalOutput });
				}
			});
		}

		if (proc.stdout && commandHandler)
			proc.stdout.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, output: data.toString().trim() })
			);
		if (proc.stderr && commandHandler)
			proc.stderr.on("data", (data: Buffer) =>
				commandHandler({ ...terminalOutput, error: data.toString().trim() })
			);

		proc.on("close", code => {
			if (!resolved) {
				resolved = true;
				resolve({ success: code === 0, stdStreams: terminalOutput });
			}
		});
	});
}

/**
 * Executes a terminal command asynchronously and captures the full output.
 * Unlike executeCommand, this accumulates all stdout/stderr output and returns
 * it in the resolved result, making it suitable for commands like 'mcdev et --json'.
 *
 * @param {TUtils.ITerminalCommandRunner} param.command - terminal command
 * @param {TUtils.ITerminalCommandRunner} param.commandArgs - terminal arguments
 * @param {TUtils.ITerminalCommandRunner} param.commandCwd - terminal working directory path
 * @returns {Promise<TUtils.ITerminalCommandResult>} object configured with the full result of executing the terminal command
 */
function executeTerminalCommandCapture({
	command,
	commandArgs,
	commandCwd
}: TUtils.ITerminalCommandRunner): Promise<TUtils.ITerminalCommandResult> {
	return new Promise(resolve => {
		let output = "";
		let error = "";
		const cwd = commandCwd ? Lib.removeLeadingRootDrivePath(commandCwd) : commandCwd;
		const proc = spawn(command, commandArgs, { shell: true, cwd });

		if (proc.stdout)
			proc.stdout.on("data", (data: Buffer) => {
				output += data.toString();
			});
		if (proc.stderr)
			proc.stderr.on("data", (data: Buffer) => {
				error += data.toString();
			});

		proc.on("error", () => {
			resolve({ success: false, stdStreams: { output: output.trim(), error: error.trim() } });
		});

		proc.on("close", code => {
			resolve({ success: code === 0, stdStreams: { output: output.trim(), error: error.trim() } });
		});
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
	{ command, commandArgs, commandCwd, commandHandler, cancellationToken }: TUtils.ITerminalCommandRunner,
	sync: boolean
): TUtils.ITerminalCommandResult | Promise<TUtils.ITerminalCommandResult> {
	if (commandCwd) commandCwd = Lib.removeLeadingRootDrivePath(commandCwd);
	return sync
		? executeCommandSync({ command, commandArgs, commandCwd })
		: executeCommand({ command, commandArgs, commandCwd, commandHandler, cancellationToken });
}

/**
 * Gets a list of the globally installed packages
 *
 * @returns {string[]} list of the installed packages names
 */
function getGlobalInstalledPackages(): string[] {
	const commandArgs: TUtils.ITerminalCommandRunner = { command: "npm", commandArgs: ["list", "-g", "--json"] };
	const terminal = <TUtils.ITerminalCommandResult>executeTerminalCommand(commandArgs, true);

	if (terminal.stdStreams.error)
		throw new Error(`[terminal_globalInstalledPackages]: Retrieving global packages: ${terminal.stdStreams.error}`);
	if (!terminal.stdStreams.output.includes('"dependencies"'))
		throw new Error(`[terminal_globalInstalledPackages]: Retrieving global packages: no "dependencies" found.`);

	const terminalOutput: { name: string; dependencies: Record<string, unknown> } = JSON.parse(
		terminal.stdStreams.output
	);
	return Object.keys(terminalOutput.dependencies || {});
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

export { executeTerminalCommand, executeTerminalCommandCapture, isPackageInstalled, installPackage };
