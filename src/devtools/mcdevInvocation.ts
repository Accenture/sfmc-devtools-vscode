import { McdevInvocation } from "./mcdevResolve";

/** Isolate bundled guidance while preserving all other inherited child environment values. */
export function mcdevEnvironment(invocation: McdevInvocation, inherited = process.env): NodeJS.ProcessEnv {
	const env = { ...inherited };
	for (const key of Object.keys(env)) {
		if (key.toUpperCase() === "MCDEV_RUNTIME_SOURCE") delete env[key];
	}
	if (invocation.source === "bundled") env.MCDEV_RUNTIME_SOURCE = "bundled";
	return env;
}

export type McdevShell = "cmd" | "powershell" | "posix";

/** Quote only raw resolver values; existing command-builder fragments remain shell syntax. */
export function quoteMcdevArgument(value: string, shell: McdevShell): string {
	if (shell === "cmd") {
		if (/["\r\n%]/.test(value))
			throw new Error("mcdev paths cannot contain quotes, newlines, or percent signs in cmd.exe.");
		return `"${value}"`;
	}
	return `'${value.replace(/'/g, shell === "powershell" ? "''" : "'\\''")}'`;
}

/** Render selected runtime without parsing or re-quoting legacy shell argument fragments. */
export function mcdevShellCommand(invocation: McdevInvocation, fragments: string[], shell: McdevShell): string {
	const prefix = shell === "powershell" ? "& " : "";
	return `${prefix}${[invocation.executable, ...invocation.prefixArgs].map(value => quoteMcdevArgument(value, shell)).join(" ")} ${fragments.join(" ")}`.trimEnd();
}
