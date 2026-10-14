import * as assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import DevToolsExtension from "../../../devtools/index";
import Mcdev from "../../../devtools/mcdev";
import { TEditor } from "@types";
import { McdevInvocation } from "../../../devtools/mcdevResolve";
import { window, workspace, Uri, env } from "../../mock/vscode";

suite("selected mcdev activation", () => {
	const invocation: McdevInvocation = {
		source: "bundled",
		executable: "C:/node path/node.exe",
		prefixArgs: ["C:/extension path/dist/mcdev/lib/cli.js"],
		cwd: "C:/project path"
	};
	function extension(failure = false): DevToolsExtension {
		const context = {
			subscriptions: [],
			extensionUri: Uri.file("C:/extension path"),
			extension: { id: "test", packageJSON: { name: "sfmc-devtools-vscode", version: "3.5.0" } }
		} as unknown as TEditor.IExtensionContext;
		const result = new DevToolsExtension(context);
		const mcdev = new Mcdev(() => {
			if (failure) throw new Error("Unsupported Node runtime");
			return invocation;
		});
		mcdev.isInstalled = () => {
			throw new Error("Must not query global npm installation");
		};
		mcdev.lookupVersion = async () => ({ success: true, stdStreams: { output: "10.0.0", error: "" } });
		(result as unknown as { mcdev: Mcdev }).mcdev = mcdev;
		result.writeLog = () => {};
		result.writeExtensionInformation = async () => {};
		result.refreshMetadataTypesInBackground = async () => {};
		return result;
	}
	setup(() => {
		workspace.workspaceFolders = [{ uri: Uri.file(invocation.cwd) }];
	});
	teardown(() => {
		workspace.workspaceFolders = undefined;
	});
	test("real runtime boundary shares native cwd with resource settings and probes PATH Node", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "mcdev cwd "));
		const runtime = path.join(root, "dist", "mcdev");
		mkdirSync(path.join(runtime, "lib"), { recursive: true });
		writeFileSync(path.join(runtime, "lib", "cli.js"), "");
		writeFileSync(
			path.join(runtime, "bundle-metadata.json"),
			JSON.stringify({ nodeEngine: "^22.22.2 || >=24.15.0" })
		);
		const originalConfiguration = workspace.getConfiguration;
		const context = {
			subscriptions: [],
			extensionUri: Uri.file(root),
			extension: { id: "test", packageJSON: { name: "sfmc-devtools-vscode", version: "3.5.0" } }
		} as unknown as TEditor.IExtensionContext;
		const result = new DevToolsExtension(context) as unknown as {
			resolveRuntime(projectPath: string): McdevInvocation;
		};
		let resource: Uri | undefined;
		workspace.getConfiguration = ((_section: string, uri: Uri) => {
			resource = uri;
			return {
				...originalConfiguration(),
				get: (key: string, fallback: unknown) => (key === "mcdevSource" ? "bundled" : fallback)
			};
		}) as typeof workspace.getConfiguration;
		try {
			const inputs = process.platform === "win32" ? [root, Uri.file(root).path] : [root];
			for (const input of inputs) {
				const selected = result.resolveRuntime(input);
				assert.strictEqual(selected.source, "bundled");
				assert.strictEqual(selected.cwd, Uri.file(root).fsPath);
				assert.strictEqual(resource?.fsPath, selected.cwd);
				assert.deepStrictEqual(selected.prefixArgs, [
					path.join(Uri.file(root).fsPath, "dist/mcdev/lib/cli.js")
				]);
			}
		} finally {
			workspace.getConfiguration = originalConfiguration;
		}
	});
	test("bundled availability activates providers and commands without global npm gate", async () => {
		const result = extension();
		const activated: string[] = [];
		result.activateContextVariables = () => {
			activated.push("context");
		};
		result.activateContainers = () => {
			activated.push("containers");
		};
		result.activateMenuCommands = () => {
			activated.push("commands");
		};
		result.activateLinkProviders = () => {
			activated.push("providers");
		};
		result.mcdevInstall = async () => {
			throw new Error("Must not offer global install");
		};
		await result.loadConfiguration();
		assert.deepStrictEqual(activated, ["context", "containers", "commands", "providers"]);
	});
	test("resolution failure shows actionable error and does not activate commands", async () => {
		const result = extension(true);
		let message = "";
		result.showInformationMessage = async (_type, text) => {
			message = text;
			return undefined;
		};
		result.activateMenuCommands = () => {
			throw new Error("Must not activate");
		};
		await result.loadConfiguration();
		assert.match(message, /Unsupported Node runtime/);
	});
	test("interactive init and join use explicit matching shell and preserve selected cwd and TTY", async () => {
		const original = window.createTerminal;
		const originalShell = env.shell;
		const seen: Array<{ options: unknown; text: string; shown: boolean }> = [];
		try {
			window.createTerminal = options => {
				const item = { options, text: "", shown: false };
				seen.push(item);
				return {
					show: () => {
						item.shown = true;
					},
					sendText: text => {
						item.text = text;
					}
				};
			};
			env.shell = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
			const result = extension();
			await result.handleInteractiveCommand("init");
			await result.handleInteractiveCommand("join");
			assert.deepStrictEqual(
				seen.map(item => item.text),
				[
					"& 'C:/node path/node.exe' 'C:/extension path/dist/mcdev/lib/cli.js' init",
					"& 'C:/node path/node.exe' 'C:/extension path/dist/mcdev/lib/cli.js' join"
				]
			);
			assert.deepStrictEqual(seen[0].options, {
				name: "mcdev init",
				cwd: invocation.cwd,
				shellPath: env.shell,
				env: { MCDEV_RUNTIME_SOURCE: "bundled" }
			});
			for (const source of ["local", "path", "custom"] as const) {
				invocation.source = source;
				await result.handleInteractiveCommand("init");
				assert.deepStrictEqual((seen.at(-1)?.options as { env: unknown }).env, { MCDEV_RUNTIME_SOURCE: null });
			}
			invocation.source = "bundled";
			assert.ok(seen.every(item => item.shown));
		} finally {
			window.createTerminal = original;
			env.shell = originalShell;
		}
	});
});
