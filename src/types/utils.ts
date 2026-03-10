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
