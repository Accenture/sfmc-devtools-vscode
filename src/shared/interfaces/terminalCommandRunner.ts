interface TerminalCommandRunner{
    command: string,
    args: string[],
    cwd: string,
    handleResult: (error: string | null, output: string | null, code: number | null) => void
}

export default TerminalCommandRunner;