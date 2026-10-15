import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { satisfies, valid, validRange } from "semver";

export type McdevSourceSetting = "auto" | "bundled" | "custom";
export type McdevSource = "local" | "path" | "bundled" | "custom";

/** Raw argv contract. Consumers append command arguments; no shell quoting is applied here. */
export interface McdevInvocation {
	source: McdevSource;
	executable: string;
	prefixArgs: string[];
	cwd: string;
}

export interface McdevResolveOptions {
	source?: McdevSourceSetting;
	customPath?: string;
	projectRoot: string;
	/** Absolute entry point supplied by the runtime artifact owner, not inferred by the resolver. */
	bundledCliPath: string;
	/** engines.node from the exact bundled mcdev package. */
	bundledNodeEngine: string;
}

export interface McdevResolveDependencies {
	platform?: NodeJS.Platform;
	env?: NodeJS.ProcessEnv;
	isExecutable?: (filename: string) => boolean;
	isFile?: (filename: string) => boolean;
	nodeVersion?: (executable: string, cwd: string) => string;
}

export type McdevResolveErrorCode =
	| "invalid-source"
	| "custom-unavailable"
	| "bundled-unavailable"
	| "invalid-engine"
	| "node-unavailable"
	| "node-version-unavailable"
	| "node-unsupported";

export class McdevResolveError extends Error {
	constructor(
		readonly code: McdevResolveErrorCode,
		message: string
	) {
		super(message);
		this.name = "McdevResolveError";
	}
}

function isFile(filename: string): boolean {
	try {
		return statSync(filename).isFile();
	} catch {
		return false;
	}
}

function isExecutable(filename: string): boolean {
	try {
		accessSync(filename, process.platform === "win32" ? constants.F_OK : constants.X_OK);
		return isFile(filename);
	} catch {
		return false;
	}
}

/** Resolve once before execution. Operation failures must never trigger another source selection. */
export function resolveMcdev(
	options: McdevResolveOptions,
	dependencies: McdevResolveDependencies = {}
): McdevInvocation {
	const platform = dependencies.platform ?? process.platform;
	const paths = platform === "win32" ? path.win32 : path.posix;
	const env = dependencies.env ?? process.env;
	const executable = dependencies.isExecutable ?? isExecutable;
	const file = dependencies.isFile ?? isFile;
	const cwd = options.projectRoot;
	const source = options.source ?? "auto";
	const invocation = (selected: McdevSource, command: string, prefixArgs: string[] = []): McdevInvocation => ({
		source: selected,
		executable: command,
		prefixArgs,
		cwd
	});
	// Search PATH directly rather than constructing shell commands. Ignore empty entries (cwd).
	const findOnPath = (names: string[]): string | undefined => {
		const pathValue = Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
		for (const directory of pathValue.split(platform === "win32" ? ";" : ":")) {
			if (!directory) {
				continue;
			}
			for (const name of names) {
				const candidate = paths.join(directory.replace(/^"(.*)"$/, "$1"), name);
				if (paths.isAbsolute(candidate) && executable(candidate)) {
					return candidate;
				}
			}
		}
		return undefined;
	};
	const cliNames = platform === "win32" ? ["mcdev.cmd", "mcdev.exe", "mcdev.bat", "mcdev"] : ["mcdev"];
	if (source === "custom") {
		const custom = options.customPath?.trim();
		if (!custom) {
			throw new McdevResolveError(
				"custom-unavailable",
				"Set sfmc-devtools-vscode.mcdevPath to an mcdev executable path when mcdevSource is custom."
			);
		}
		const customExecutable = paths.resolve(cwd, custom);
		if (!executable(customExecutable)) {
			throw new McdevResolveError(
				"custom-unavailable",
				`Custom mcdev executable is missing or not executable: ${customExecutable}. Check sfmc-devtools-vscode.mcdevPath.`
			);
		}
		return invocation("custom", customExecutable);
	}
	if (source !== "auto" && source !== "bundled") {
		throw new McdevResolveError(
			"invalid-source",
			`Invalid mcdevSource: ${source}. Select auto, bundled, or custom.`
		);
	}
	if (source === "auto") {
		for (const name of cliNames) {
			const local = paths.join(cwd, "node_modules", ".bin", name);
			if (executable(local)) {
				return invocation("local", local);
			}
		}
		const installed = findOnPath(cliNames);
		if (installed) {
			return invocation("path", installed);
		}
	}
	// Only bundled selection needs the bundled artifact and its Node engine validation.
	if (!paths.isAbsolute(options.bundledCliPath) || !file(options.bundledCliPath)) {
		throw new McdevResolveError(
			"bundled-unavailable",
			`Bundled mcdev CLI is missing: ${options.bundledCliPath}. Reinstall the extension.`
		);
	}
	if (!options.bundledNodeEngine.trim() || !validRange(options.bundledNodeEngine)) {
		throw new McdevResolveError(
			"invalid-engine",
			"The bundled mcdev Node engine requirement is invalid. Reinstall the extension."
		);
	}
	const node = findOnPath(platform === "win32" ? ["node.exe"] : ["node"]);
	if (!node) {
		throw new McdevResolveError(
			"node-unavailable",
			`Bundled mcdev requires Node ${options.bundledNodeEngine} on PATH. Install a compatible Node.js runtime and restart VS Code/Cursor.`
		);
	}
	let version: string;
	try {
		version = (
			dependencies.nodeVersion ??
			((command, project) =>
				execFileSync(command, ["--version"], {
					cwd: project,
					encoding: "utf8",
					timeout: 5000,
					windowsHide: true,
					stdio: ["ignore", "pipe", "pipe"]
				}))
		)(node, cwd).trim();
	} catch {
		throw new McdevResolveError(
			"node-version-unavailable",
			`Cannot read the Node.js version from ${node}. Check your Node.js installation and restart VS Code/Cursor.`
		);
	}
	if (!valid(version)) {
		throw new McdevResolveError(
			"node-version-unavailable",
			`Invalid Node.js version from ${node}: ${version}. Check your Node.js installation.`
		);
	}
	if (!satisfies(version, options.bundledNodeEngine)) {
		throw new McdevResolveError(
			"node-unsupported",
			`Node ${version} at ${node} does not satisfy bundled mcdev's requirement ${options.bundledNodeEngine}. Install a compatible Node.js runtime on PATH and restart VS Code/Cursor.`
		);
	}
	return invocation("bundled", node, [options.bundledCliPath]);
}
