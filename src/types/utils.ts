interface ITerminalCommandStreams {
	output: string;
	error: string;
}

interface ICancellationToken {
	isCancellationRequested: boolean;
	onCancellationRequested: (listener: () => void) => void;
}

interface ITerminalCommandRunner {
	command: string;
	commandArgs: string[];
	/** Selected runtime: raw executable and prefix argv, appended before legacy shell fragments. */
	invocation?: import("../devtools/mcdevResolve").McdevInvocation;
	commandCwd?: string;
	commandHandler?: (terminalStreams: ITerminalCommandStreams) => void;
	cancellationToken?: ICancellationToken;
}

interface ITerminalCommandResult {
	success: boolean;
	stdStreams: ITerminalCommandStreams;
}

interface IOutputLogger {
	info?: string;
	output?: string;
	error?: string;
}

export { ICancellationToken, ITerminalCommandRunner, ITerminalCommandStreams, ITerminalCommandResult, IOutputLogger };
