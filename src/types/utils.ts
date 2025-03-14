interface ITerminalCommandStreams {
	output: string;
	error: string;
}

interface ITerminalCommandRunner {
	command: string;
	commandArgs: string[];
	commandCwd?: string;
	commandHandler?: (terminalStreams: ITerminalCommandStreams) => void;
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

export { ITerminalCommandRunner, ITerminalCommandStreams, ITerminalCommandResult, IOutputLogger };
