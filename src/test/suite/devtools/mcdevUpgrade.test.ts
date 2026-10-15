import * as assert from "node:assert";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import Mcdev from "../../../devtools/mcdev";
import DevToolsExtension, { type McdevExecute } from "../../../devtools/index";
import { TEditor, TUtils } from "@types";
import { Terminal } from "utils";
import { window, Uri } from "../../mock/vscode";

suite("explicit mcdev project upgrade guidance", () => {
	const guidance = "Run 'mcdev upgrade' now to fix this.";
	const originalExecute = Terminal.executeTerminalCommand;
	teardown(() => {
		Terminal.executeTerminalCommand = originalExecute;
		window.__progressToken.isCancellationRequested = false;
	});

	function mcdev(): Mcdev {
		return new Mcdev(projectPath => ({
			source: "bundled",
			executable: "node",
			prefixArgs: ["cli.js"],
			cwd: projectPath
		}));
	}

	test("detects split stdout and stderr guidance independently of exit status and preserves output", async () => {
		for (const success of [true, false]) {
			for (const stream of ["output", "error"] as const) {
				const logged: TUtils.IOutputLogger[] = [];
				Terminal.executeTerminalCommand = async config => {
					for (const chunk of [guidance.slice(0, 12), guidance.slice(12), guidance]) {
						config.rawChunkHandler?.(chunk, stream);
						config.commandHandler?.({ output: "", error: "", [stream]: chunk });
					}
					return { success, stdStreams: { output: "", error: "" } };
				};
				const result = await mcdev().execute("reloadBUs", entry => logged.push(entry), {
					projectPath: "/second/project"
				});
				assert.deepStrictEqual(result, { success, upgradeRequiredProjectPaths: ["/second/project"] });
				assert.strictEqual(logged.map(entry => entry[stream] || "").join(""), guidance + guidance);
			}
		}
	});

	test("real terminal adapter preserves raw whitespace and interleaving without changing display", async () => {
		const originalSpawn = childProcess.spawn;
		try {
			for (const stream of ["output", "error"] as const) {
				const proc = Object.assign(new EventEmitter(), {
					stdout: new EventEmitter(),
					stderr: new EventEmitter()
				});
				childProcess.spawn = (() => proc) as unknown as typeof childProcess.spawn;
				const displayed: TUtils.IOutputLogger[] = [];
				const running = mcdev().execute("reloadBUs", entry => displayed.push({ ...entry }), {
					projectPath: "/project"
				});
				const target = stream === "output" ? proc.stdout : proc.stderr;
				const other = stream === "output" ? proc.stderr : proc.stdout;
				target.emit("data", Buffer.from("Run 'mcdev upgrade' "));
				other.emit("data", Buffer.from("unrelated stream output"));
				target.emit("data", Buffer.from("now to fix this."));
				proc.emit("close", 0);
				assert.deepStrictEqual(await running, { success: true, upgradeRequiredProjectPaths: ["/project"] });
				const chunks = displayed.filter(entry => entry.output !== undefined);
				assert.strictEqual(chunks.length, 3);
				assert.strictEqual(chunks[0][stream], "Run 'mcdev upgrade'", "display still trims chunks");
				assert.strictEqual(chunks[1][stream], "Run 'mcdev upgrade'", "display still retains the other stream");
				assert.strictEqual(chunks[2][stream], "now to fix this.");
			}
		} finally {
			childProcess.spawn = originalSpawn;
		}
	});

	test("recognizes current configuration and formatter guidance, not CLI installs or unrelated upgrades", async () => {
		for (const [message, expected] of [
			["Run 'mcdev upgrade' to fix missing or changed configuration options", true],
			["Run 'mcdev upgrade' to ensure optimal performance", true],
			["No .prettierrc found in your project directory. Please run 'mcdev upgrade' to create it", true],
			["Run 'npm install -g mcdev@10' now to fix this.", false],
			["mcdev upgrade completed", false],
			["upgrade available", false]
		] as const) {
			Terminal.executeTerminalCommand = async config => {
				config.rawChunkHandler?.(message, "error");
				return { success: true, stdStreams: { output: "", error: "" } };
			};
			assert.deepStrictEqual(await mcdev().execute("reloadBUs", () => {}, { projectPath: "/project" }), {
				success: true,
				...(expected ? { upgradeRequiredProjectPaths: ["/project"] } : {})
			});
		}
	});

	test("does not join diagnostics across streams or invocations and attributes each project", async () => {
		let invocation = 0;
		Terminal.executeTerminalCommand = async config => {
			invocation++;
			config.rawChunkHandler?.(invocation === 1 ? "Run 'mcdev " : "upgrade' now to fix this.", "output");
			config.rawChunkHandler?.("upgrade' now to fix this.", "error");
			if (invocation > 2) config.rawChunkHandler?.(guidance, "error");
			return { success: false, stdStreams: { output: "", error: "" } };
		};
		const filesDetails = ["/one", "/two", "/three", "/three"].map(projectPath => ({
			level: "bu_folder",
			projectPath,
			topFolder: "/retrieve/",
			credentialsName: "cred",
			businessUnit: "bu",
			path: `${projectPath}/retrieve/cred/bu`
		})) as Parameters<Mcdev["execute"]>[2]["filesDetails"];
		const result = await mcdev().execute("retrieve", () => {}, { filesDetails });
		assert.deepStrictEqual(result.upgradeRequiredProjectPaths, ["/three"]);
	});

	function extension(executeMcdev: McdevExecute): DevToolsExtension {
		const context = {
			subscriptions: [],
			extensionUri: Uri.file("/extension"),
			extension: { id: "test", packageJSON: { name: "sfmc-devtools-vscode", version: "3.6.0" } }
		} as unknown as TEditor.IExtensionContext;
		const result = new DevToolsExtension(context, { executeMcdev });
		result.writeLog = () => {};
		result.updateStatusBar = () => {};
		return result;
	}

	for (const success of [true, false]) {
		for (const answer of ["Upgrade", "More Details", undefined]) {
			test(`offers one targeted warning on ${success ? "success" : "failure"}, choice ${answer}`, async () => {
				let finished = false;
				const result = extension(async () => ({
					success,
					upgradeRequiredProjectPaths: ["/second/project", "/second/project"]
				}));
				const prompts: unknown[][] = [];
				result.showInformationMessage = async (...args) => {
					assert.ok(finished);
					prompts.push(args);
					return answer;
				};
				let details = 0;
				result.showOuputChannel = () => {
					details++;
				};
				const pending = result.executeCommand("retrieve", { filesDetails: [] });
				finished = true;
				const upgrades: unknown[][] = [];
				result.executeCommand = async (...args) => {
					upgrades.push(args);
					return true;
				};
				assert.strictEqual(await pending, success);
				// Completion resolves before the notification and its selected action settle.
				await new Promise<void>(resolve => setImmediate(resolve));
				assert.strictEqual(prompts.length, 1);
				assert.strictEqual(prompts[0][0], "warning");
				assert.match(String(prompts[0][1]), /\/second\/project/);
				assert.deepStrictEqual(prompts[0][2], ["Upgrade", "More Details"]);
				assert.ok(!prompts[0][3], "warning must be nonmodal");
				assert.deepStrictEqual(
					upgrades,
					answer === "Upgrade" ? [["upgrade", { projectPath: "/second/project" }]] : []
				);
				assert.strictEqual(details, answer === "More Details" ? 1 : 0);
			});
		}
	}

	test("cancellation suppresses all completion prompts; upgrade itself never offers another upgrade", async () => {
		for (const cancelled of [true, false]) {
			const result = extension(async (_command, _handler, _parameters, token) => {
				if (token) token.isCancellationRequested = cancelled;
				return { success: false, upgradeRequiredProjectPaths: ["/project"] };
			});
			const prompts: unknown[][] = [];
			result.showInformationMessage = async (...args) => {
				prompts.push(args);
				return undefined;
			};
			await result.executeCommand(cancelled ? "retrieve" : "upgrade", { projectPath: "/project" });
			await new Promise<void>(resolve => setImmediate(resolve));
			assert.strictEqual(prompts.length, cancelled ? 0 : 1);
			if (!cancelled) assert.deepStrictEqual(prompts[0][2], ["More Details"]);
		}
	});
});
