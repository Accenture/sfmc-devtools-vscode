import * as assert from "node:assert";
import {
	resolveMcdev,
	McdevResolveError,
	McdevResolveOptions,
	McdevResolveDependencies,
	McdevResolveErrorCode
} from "../../../devtools/mcdevResolve";
import { readFileSync } from "node:fs";
import path from "node:path";

suite("mcdev source resolver", () => {
	const options: McdevResolveOptions = {
		projectRoot: "/project with spaces",
		bundledCliPath: "/extension with spaces/runtime/bin/mcdev.js",
		bundledNodeEngine: "^22.22.2 || >=24.15.0"
	};
	function dependencies(files: string[] = []): McdevResolveDependencies {
		return {
			platform: "linux",
			env: { PATH: "/tools:/other tools" },
			isExecutable: filename => files.includes(filename),
			isFile: filename => filename === options.bundledCliPath,
			nodeVersion: () => "v24.15.0\n"
		};
	}
	function error(code: McdevResolveErrorCode, input: McdevResolveOptions, deps: McdevResolveDependencies): void {
		assert.throws(
			() => resolveMcdev(input, deps),
			(failure: unknown) => failure instanceof McdevResolveError && failure.code === code
		);
	}
	test("manifest defaults to auto and has a custom executable path", () => {
		const manifest = JSON.parse(readFileSync(path.resolve(__dirname, "../../../../package.json"), "utf8"));
		const settings = manifest.contributes.configuration.properties;
		assert.strictEqual(settings["sfmc-devtools-vscode.mcdevSource"].default, "auto");
		assert.deepStrictEqual(settings["sfmc-devtools-vscode.mcdevSource"].enum, ["auto", "bundled", "custom"]);
		assert.strictEqual(settings["sfmc-devtools-vscode.mcdevPath"].default, "");
	});
	test("setup walkthrough explains bundled runtime without mandatory global installation", () => {
		const manifest = JSON.parse(readFileSync(path.resolve(__dirname, "../../../../package.json"), "utf8"));
		const setup = manifest.contributes.walkthroughs[0].steps.find(
			(step: { id: string }) => step.id === "installMcdev"
		);
		assert.strictEqual(setup.title, "Check Node/npm and mcdev source");
		assert.match(setup.description, /no global installation is required/);
		assert.match(setup.description, /project-local, PATH, then bundled/);
		assert.match(setup.description, /restart the IDE/);
		assert.match(setup.description, /required for join and Git-backed delta/);
	});
	test("auto prefers project-local before PATH and does not probe Node", () => {
		const local = `${options.projectRoot}/node_modules/.bin/mcdev`;
		assert.deepStrictEqual(
			resolveMcdev(options, {
				...dependencies([local, "/tools/mcdev"]),
				nodeVersion: () => {
					throw new Error("must not probe");
				}
			}),
			{ source: "local", executable: local, prefixArgs: [], cwd: options.projectRoot }
		);
	});
	test("auto selects absolute PATH executable without shell interpolation", () => {
		assert.deepStrictEqual(resolveMcdev(options, dependencies(["/other tools/mcdev"])), {
			source: "path",
			executable: "/other tools/mcdev",
			prefixArgs: [],
			cwd: options.projectRoot
		});
	});
	test("auto falls back to bundled with separate unquoted argv", () => {
		assert.deepStrictEqual(resolveMcdev(options, dependencies(["/tools/node"])), {
			source: "bundled",
			executable: "/tools/node",
			prefixArgs: [options.bundledCliPath],
			cwd: options.projectRoot
		});
	});
	test("explicit bundled ignores installed mcdev", () => {
		assert.strictEqual(
			resolveMcdev({ ...options, source: "bundled" }, dependencies(["/tools/mcdev", "/tools/node"])).source,
			"bundled"
		);
	});
	test("custom resolves relative paths and preserves spaces", () => {
		assert.deepStrictEqual(
			resolveMcdev(
				{ ...options, source: "custom", customPath: " ./custom cli " },
				dependencies([`${options.projectRoot}/custom cli`])
			),
			{
				source: "custom",
				executable: `${options.projectRoot}/custom cli`,
				prefixArgs: [],
				cwd: options.projectRoot
			}
		);
	});
	test("explicit missing/empty custom does not fall back", () => {
		for (const customPath of [undefined, " ", "/missing"]) {
			error(
				"custom-unavailable",
				{ ...options, source: "custom", customPath },
				dependencies(["/tools/mcdev", "/tools/node"])
			);
		}
	});
	test("missing bundled entry and relative artifact paths are errors", () => {
		error(
			"bundled-unavailable",
			{ ...options, source: "bundled" },
			{ ...dependencies(["/tools/mcdev"]), isFile: () => false }
		);
		error("bundled-unavailable", { ...options, bundledCliPath: "runtime/cli.js" }, dependencies());
	});
	test("bundled errors distinguish missing, broken, invalid, and unsupported Node", () => {
		error("node-unavailable", options, dependencies());
		error("node-version-unavailable", options, {
			...dependencies(["/tools/node"]),
			nodeVersion: () => {
				throw new Error("spawn failed");
			}
		});
		error("node-version-unavailable", options, {
			...dependencies(["/tools/node"]),
			nodeVersion: () => "not a version"
		});
		for (const version of ["v22.22.1", "v23.0.0", "v24.14.9"]) {
			error("node-unsupported", options, { ...dependencies(["/tools/node"]), nodeVersion: () => version });
		}
	});
	test("engine validation uses exact supplied range, including disjunction", () => {
		for (const version of ["v22.22.2", "v24.15.0", "v26.0.0"]) {
			assert.strictEqual(
				resolveMcdev(options, { ...dependencies(["/tools/node"]), nodeVersion: () => version }).source,
				"bundled"
			);
		}
		for (const bundledNodeEngine of ["", "not an engine"]) {
			error("invalid-engine", { ...options, bundledNodeEngine }, dependencies(["/tools/node"]));
		}
	});
	test("Windows local .cmd and PATH node.exe work with spaced paths", () => {
		const windows: McdevResolveOptions = {
			...options,
			projectRoot: "C:\\project space",
			bundledCliPath: "C:\\extension space\\mcdev.js"
		};
		const deps: McdevResolveDependencies = {
			platform: "win32",
			env: { Path: '"C:\\tool space";C:\\other' },
			isExecutable: filename =>
				["C:\\project space\\node_modules\\.bin\\mcdev.cmd", "C:\\tool space\\node.exe"].includes(filename),
			isFile: () => true,
			nodeVersion: () => "v24.15.0"
		};
		assert.strictEqual(resolveMcdev(windows, deps).executable, "C:\\project space\\node_modules\\.bin\\mcdev.cmd");
		assert.deepStrictEqual(resolveMcdev({ ...windows, source: "bundled" }, deps), {
			source: "bundled",
			executable: "C:\\tool space\\node.exe",
			prefixArgs: [windows.bundledCliPath],
			cwd: windows.projectRoot
		});
	});
	test("Windows PATH selects .cmd before extensionless shim", () => {
		assert.strictEqual(
			resolveMcdev(
				{ ...options, projectRoot: "C:\\project" },
				{
					...dependencies(),
					platform: "win32",
					env: { PATH: "C:\\tools" },
					isExecutable: filename => ["C:\\tools\\mcdev.cmd", "C:\\tools\\mcdev"].includes(filename)
				}
			).executable,
			"C:\\tools\\mcdev.cmd"
		);
	});
	test("invalid source rejects rather than silently choosing auto", () => {
		error(
			"invalid-source",
			{ ...options, source: "typo" as McdevResolveOptions["source"] },
			dependencies(["/tools/mcdev"])
		);
	});
});
