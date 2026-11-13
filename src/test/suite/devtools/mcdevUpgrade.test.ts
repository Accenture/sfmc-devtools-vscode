import * as assert from "node:assert";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import Mcdev, { type McdevUpgradeContext } from "../../../devtools/mcdev";
import fs from "node:fs";
import { MessagesEditor } from "@messages";
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

	test("reports split stdout and stderr guidance only on failure and preserves output", async () => {
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
				assert.strictEqual(result.success, success);
				assert.deepStrictEqual(result.upgradeRequiredProjectPaths, success ? undefined : ["/second/project"]);
				assert.strictEqual(
					result.upgradeRequiredProjects?.[0].invocation.cwd,
					success ? undefined : "/second/project"
				);
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
				proc.emit("close", 1);
				const result = await running;
				assert.strictEqual(result.success, false);
				assert.deepStrictEqual(result.upgradeRequiredProjectPaths, ["/project"]);
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

	test("recognizes only the exact requested guidance", async () => {
		for (const [message, expected] of [
			[guidance, true],
			["Run 'mcdev upgrade' to fix missing or changed configuration options", false],
			["Run 'mcdev upgrade' to ensure optimal performance", false],
			["No .prettierrc found in your project directory. Please run 'mcdev upgrade' to create it", false],
			["Run 'npm install -g mcdev@10' now to fix this.", false],
			["mcdev upgrade completed", false],
			["upgrade available", false]
		] as const) {
			Terminal.executeTerminalCommand = async config => {
				config.rawChunkHandler?.(message, "error");
				return { success: false, stdStreams: { output: "", error: "" } };
			};
			const result = await mcdev().execute("reloadBUs", () => {}, { projectPath: "/project" });
			assert.strictEqual(result.success, false);
			assert.deepStrictEqual(result.upgradeRequiredProjectPaths, expected ? ["/project"] : undefined);
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
		assert.deepStrictEqual(
			result.upgradeRequiredProjects?.map(context => [context.projectPath, context.invocation.cwd]),
			[["/three", "/three"]]
		);
	});

	test("retains separate captured runtimes for all affected projects", async () => {
		Terminal.executeTerminalCommand = async config => {
			config.rawChunkHandler?.(guidance, "error");
			return { success: false, stdStreams: { output: "", error: "" } };
		};
		const runner = new Mcdev(projectPath => ({
			source: projectPath === "/one" ? "bundled" : "custom",
			executable: `node-${projectPath.slice(1)}`,
			prefixArgs: ["cli.js"],
			cwd: projectPath
		}));
		const filesDetails = ["/one", "/two"].map(projectPath => ({
			level: "bu_folder",
			projectPath,
			topFolder: "/retrieve/",
			credentialsName: "cred",
			businessUnit: "bu",
			path: `${projectPath}/retrieve/cred/bu`
		})) as Parameters<Mcdev["execute"]>[2]["filesDetails"];
		const result = await runner.execute("retrieve", () => {}, { filesDetails });
		assert.deepStrictEqual(
			result.upgradeRequiredProjects?.map(context => [
				context.projectPath,
				context.invocation.source,
				context.invocation.executable
			]),
			[
				["/one", "bundled", "node-one"],
				["/two", "custom", "node-two"]
			]
		);
	});

	test("cancellation and upgrade failures never produce repair contexts", async () => {
		const token: TUtils.ICancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: () => {}
		};
		Terminal.executeTerminalCommand = async config => {
			config.rawChunkHandler?.(guidance, "error");
			token.isCancellationRequested = true;
			return { success: false, stdStreams: { output: "", error: "" } };
		};
		assert.strictEqual(
			(await mcdev().execute("reloadBUs", () => {}, { projectPath: "/project" }, token)).upgradeRequiredProjects,
			undefined
		);
		token.isCancellationRequested = false;
		assert.strictEqual(
			(await mcdev().execute("upgrade", () => {}, { projectPath: "/project" })).upgradeRequiredProjects,
			undefined
		);
	});

	test("bounds diagnostic tails and handles every split boundary", async () => {
		for (let split = 1; split < guidance.length; split++) {
			Terminal.executeTerminalCommand = async config => {
				config.rawChunkHandler?.("x".repeat(10000) + guidance.slice(0, split), "output");
				config.rawChunkHandler?.("unrelated", "error");
				config.rawChunkHandler?.(guidance.slice(split), "output");
				return { success: false, stdStreams: { output: "", error: "" } };
			};
			const result = await mcdev().execute("reloadBUs", () => {}, { projectPath: "/project" });
			assert.deepStrictEqual(result.upgradeRequiredProjectPaths, ["/project"], `split ${split}`);
		}
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

	const repairContext = (projectPath = "/second/project"): McdevUpgradeContext => ({
		projectPath,
		invocation: { source: "custom", executable: "captured-node", prefixArgs: ["captured-cli.js"], cwd: projectPath }
	});
	const settle = () => new Promise<void>(resolve => setImmediate(resolve));

	for (const answer of ["Run mcdev upgrade", "Upgrade", "More Details", undefined]) {
		for (const confirm of [MessagesEditor.projectUpgradeConfirmAction, undefined]) {
			test(`exact repair action ${answer}, confirmation ${confirm}`, async () => {
				const context = repairContext();
				let originalRuns = 0;
				const result = extension(async () => {
					originalRuns++;
					return { success: false, upgradeRequiredProjects: [context, context] };
				});
				const runner = (result as unknown as { mcdev: Mcdev }).mcdev;
				const probes: unknown[] = [];
				runner.lookupInvocationVersion = async invocation => {
					probes.push(invocation);
					return { success: true, stdStreams: { output: "10.2.3\n", error: "" } };
				};
				const upgrades: unknown[] = [];
				runner.executeConfirmedUpgrade = async (captured, output, token) => {
					upgrades.push(captured);
					assert.strictEqual(token, window.__progressToken);
					output({ info: "confirmed upgrade" });
					return { success: false, upgradeRequiredProjects: [context] };
				};
				const prompts: unknown[][] = [];
				result.showInformationMessage = async (...args) => {
					prompts.push(args);
					return prompts.length === 1 ? answer : prompts.length === 2 ? confirm : undefined;
				};
				let details = 0;
				result.showOuputChannel = () => {
					details++;
				};
				assert.strictEqual(await result.executeCommand("retrieve", { filesDetails: [] }), false);
				await settle();
				const confirmed = answer === MessagesEditor.projectUpgradeAction && !!confirm;
				assert.strictEqual(originalRuns, 1, "never retries original operation or executes Git");
				assert.deepStrictEqual(probes, [context.invocation]);
				assert.deepStrictEqual(upgrades, confirmed ? [context] : []);
				assert.strictEqual(details, answer === "More Details" ? 1 : 0);
				assert.deepStrictEqual(prompts[0][2], ["Run mcdev upgrade", "More Details"]);
				assert.match(String(prompts[0][1]), /\/second\/project.*config version: unknown.*CLI version: 10.2.3/);
				assert.ok(!prompts[0][3]);
				assert.strictEqual(
					prompts.length,
					confirmed ? 3 : answer === MessagesEditor.projectUpgradeAction ? 2 : 1
				);
				if (answer === MessagesEditor.projectUpgradeAction) {
					assert.strictEqual(prompts[1][3], true);
					assert.deepStrictEqual(prompts[1][2], [MessagesEditor.projectUpgradeConfirmAction]);
					for (const warning of [
						/tooling/,
						/dependencies/,
						/teammates/,
						/pending deployments/,
						/Save or commit/,
						/owner or tech lead/,
						/manual.*Git/,
						/no rollback or undo/
					])
						assert.match(String(prompts[1][1]), warning);
				}
				if (confirmed) {
					assert.deepStrictEqual(prompts[2][2], ["More Details"]);
					assert.match(String(prompts[2][1]), /partial changes.*manual.*Git.*no rollback or undo/);
				}
			});
		}
	}

	test("versions use affected config and captured CLI, with missing and unreadable fallbacks", async () => {
		const originalRead = fs.readFileSync;
		try {
			for (const [config, expected] of [
				['{"version":"9.1.0"}', "9.1.0"],
				["{}", "not specified"],
				["broken", "unknown"]
			]) {
				const context = repairContext();
				const result = extension(async () => ({ success: false, upgradeRequiredProjects: [context] }));
				fs.readFileSync = ((file: unknown) => {
					assert.ok(String(file).replace(/\\/g, "/").endsWith("/second/project/.mcdevrc.json"));
					return config;
				}) as typeof fs.readFileSync;
				(result as unknown as { mcdev: Mcdev }).mcdev.lookupInvocationVersion = async () => {
					throw Error("missing runtime");
				};
				const prompts: string[] = [];
				result.showInformationMessage = async (_type, message) => {
					prompts.push(message);
					return undefined;
				};
				await result.executeCommand("retrieve", { filesDetails: [] });
				await settle();
				assert.ok(prompts[0].includes(`config version: ${expected}. mcdev CLI version: unknown.`));
			}
		} finally {
			fs.readFileSync = originalRead;
		}
	});

	test("multi-root repair consent is separate and never defaults to first workspace", async () => {
		const contexts = [repairContext("/one"), repairContext("/two")];
		const result = extension(async () => ({ success: false, upgradeRequiredProjects: contexts }));
		const runner = (result as unknown as { mcdev: Mcdev }).mcdev;
		runner.lookupInvocationVersion = async invocation => ({
			success: true,
			stdStreams: { output: invocation.cwd, error: "" }
		});
		const upgraded: McdevUpgradeContext[] = [];
		runner.executeConfirmedUpgrade = async context => {
			upgraded.push(context);
			return { success: true };
		};
		const prompts: string[] = [];
		result.showInformationMessage = async (_type, message, _options, modal) => {
			prompts.push(message);
			if (modal) return MessagesEditor.projectUpgradeConfirmAction;
			return message.includes("at /two.") ? MessagesEditor.projectUpgradeAction : undefined;
		};
		await result.executeCommand("retrieve", { filesDetails: [] });
		await settle();
		assert.deepStrictEqual(upgraded, [contexts[1]]);
		assert.strictEqual(prompts.length, 4);
	});

	test("unrelated failures retain generic notification and only explicit details opens output", async () => {
		for (const answer of ["unexpected", undefined, "More Details"]) {
			const result = extension(async () => ({ success: false }));
			const prompts: unknown[][] = [];
			let details = 0;
			result.showInformationMessage = async (...args) => {
				prompts.push(args);
				return answer;
			};
			result.showOuputChannel = () => {
				details++;
			};
			await result.executeCommand("retrieve", { filesDetails: [] });
			await settle();
			assert.strictEqual(prompts.length, 1);
			assert.strictEqual(prompts[0][1], MessagesEditor.runningCommandFailure);
			assert.deepStrictEqual(prompts[0][2], ["More Details"]);
			assert.strictEqual(details, answer === "More Details" ? 1 : 0);
		}
	});

	test("confirmed upgrade cancellation uses normal progress and preserves manual recovery warning", async () => {
		const context = repairContext();
		const result = extension(async () => ({ success: false, upgradeRequiredProjects: [context] }));
		const runner = (result as unknown as { mcdev: Mcdev }).mcdev;
		runner.lookupInvocationVersion = async () => ({ success: false, stdStreams: { output: "", error: "" } });
		runner.executeConfirmedUpgrade = async (captured, _output, token) => {
			assert.strictEqual(captured, context);
			assert.strictEqual(token, window.__progressToken);
			if (token) token.isCancellationRequested = true;
			return { success: false, upgradeRequiredProjects: [context] };
		};
		const prompts: string[] = [];
		const logs: string[] = [];
		result.writeLog = (_channel, message) => {
			logs.push(message);
		};
		result.showInformationMessage = async (_type, message, _options, modal) => {
			prompts.push(message);
			return modal ? MessagesEditor.projectUpgradeConfirmAction : MessagesEditor.projectUpgradeAction;
		};
		await result.executeCommand("retrieve", { filesDetails: [] });
		await settle();
		assert.strictEqual(prompts.length, 2, "no cancellation completion or recursive repair popup");
		assert.ok(logs.some(message => /cancelled.*partial changes.*manual.*Git/.test(message)));
	});

	test("cancellation suppresses all completion prompts; upgrade itself never offers another upgrade", async () => {
		for (const cancelled of [true, false]) {
			const result = extension(async (_command, _handler, _parameters, token) => {
				if (token) token.isCancellationRequested = cancelled;
				return { success: false, upgradeRequiredProjects: [repairContext("/project")] };
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
