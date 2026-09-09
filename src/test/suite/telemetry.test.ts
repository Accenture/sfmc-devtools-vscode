import * as assert from "assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { trackCommandResult } from "../../commandTelemetry";
import { ExtensionLifecycleCoordinator } from "../../extensionLifecycle";
import { McdevVersionTelemetry } from "../../mcdevVersionTelemetry";
import DevToolsExtension, { type McdevExecute } from "../../devtools/index";
import { activate, deactivate } from "../../extension";
import { TelemetryReporter, detectEcosystem, type TelemetryValue } from "../../telemetry";
import { env, extensions, window, type MockExtension } from "../mock/vscode";
import { TEditor } from "@types";

interface FetchCall {
	url: string;
	body: string;
	signal?: AbortSignal;
}

interface TelemetryEvent {
	event: string;
	properties: Record<string, TelemetryValue>;
}

interface TelemetrySink {
	events: TelemetryEvent[];
	disposeCalls: number;
	track(event: string, props?: Record<string, TelemetryValue>): void;
	disposeAsync(): Promise<void>;
}

function createSink(): TelemetrySink {
	return {
		events: [],
		disposeCalls: 0,
		track(event, props = {}) {
			this.events.push({ event, properties: props });
		},
		async disposeAsync() {
			this.disposeCalls += 1;
		}
	};
}

function makeContext(): TEditor.IExtensionContext {
	return {
		subscriptions: [],
		extensionPath: ".",
		extension: {
			id: "Accenture-oss.sfmc-devtools-vscode",
			packageJSON: { name: "sfmc-devtools-vscode", version: "9.9.9" }
		},
		globalState: {
			get: () => "9.9.9",
			update: async () => undefined,
			setKeysForSync: () => undefined
		}
	} as unknown as TEditor.IExtensionContext;
}

interface ExtensionInternals {
	vscodeEditor: {
		getWindow(): { createStatusBarItem(command: string, title: string, name: string): void };
	};
}

function primeStatusBar(extension: DevToolsExtension): void {
	(extension as unknown as ExtensionInternals).vscodeEditor
		.getWindow()
		.createStatusBarItem("sfmc-devtools-vscode.openOutputChannel", "mcdev", "mcdev");
}

function idleLookup(): Promise<{ success: boolean; stdStreams: { output: string; error: string } }> {
	return Promise.resolve({ success: false, stdStreams: { output: "", error: "" } });
}

function stubFetch(heldOpen = false): {
	calls: FetchCall[];
	resolveAll: () => void;
	restore: () => void;
} {
	const calls: FetchCall[] = [];
	const resolvers: Array<() => void> = [];
	const original = globalThis.fetch;
	globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), body: String(init?.body ?? ""), signal: init?.signal ?? undefined });
		if (!heldOpen) return Promise.resolve(new Response(null, { status: 200 }));
		return new Promise<Response>((resolve, reject) => {
			const abort = (): void => reject(new DOMException("Aborted", "AbortError"));
			init?.signal?.addEventListener("abort", abort, { once: true });
			resolvers.push(() => resolve(new Response(null, { status: 200 })));
		});
	}) as typeof fetch;
	return {
		calls,
		resolveAll: () => resolvers.splice(0).forEach(resolve => resolve()),
		restore: () => {
			globalThis.fetch = original;
		}
	};
}

suite("telemetry", () => {
	teardown(async () => {
		env.isTelemetryEnabled = true;
		env.__listeners = [];
		extensions.__installed = [];
		window.__progressToken.isCancellationRequested = false;
		await deactivate();
	});

	test("disposeAsync awaits the final fetch and is idempotent", async () => {
		const fetchStub = stubFetch(true);
		try {
			const reporter = new TelemetryReporter({ extensionName: "sfmc-devtools", extensionVersion: "9.9.9" });
			reporter.track("extension.activated", { isDevToolsProject: true });
			let settled = false;
			const disposal = reporter.disposeAsync().then(() => {
				settled = true;
			});
			await Promise.resolve();
			assert.strictEqual(fetchStub.calls.length, 1);
			assert.strictEqual(settled, false, "shutdown must wait for the held request");
			fetchStub.resolveAll();
			await disposal;
			await reporter.disposeAsync();
			assert.strictEqual(fetchStub.calls.length, 1, "repeated disposal must not send twice");
		} finally {
			fetchStub.restore();
		}
	});

	test("disabling telemetry aborts an in-flight request", async () => {
		const fetchStub = stubFetch(true);
		try {
			const reporter = new TelemetryReporter({ extensionName: "sfmc-devtools", extensionVersion: "9.9.9" });
			reporter.track("command.executed", { command: "retrieve", durationMs: 5 });
			void reporter.flush();
			assert.strictEqual(fetchStub.calls.length, 1);
			const signal = fetchStub.calls[0].signal;
			assert.ok(signal);
			env.__fireTelemetryChange(false);
			assert.strictEqual(signal.aborted, true);
			reporter.dispose();
		} finally {
			fetchStub.restore();
		}
	});

	test("activation and deactivation await initialization and final drain in order", async () => {
		const order: string[] = [];
		let resolveInit: (() => void) | undefined;
		let resolveDispose: (() => void) | undefined;
		const init = new Promise<void>(resolve => {
			resolveInit = resolve;
		});
		const dispose = new Promise<void>(resolve => {
			resolveDispose = resolve;
		});
		const lifecycle = new ExtensionLifecycleCoordinator();
		const activation = lifecycle.activate({
			init: async () => {
				order.push("init-start");
				await init;
				order.push("init-end");
			},
			disposeTelemetry: async () => {
				order.push("dispose-start");
				await dispose;
				order.push("dispose-end");
			}
		});
		const deactivation = lifecycle.deactivate();
		await Promise.resolve();
		assert.deepStrictEqual(order, ["init-start"]);
		resolveInit?.();
		await activation;
		await Promise.resolve();
		assert.deepStrictEqual(order, ["init-start", "init-end", "dispose-start"]);
		resolveDispose?.();
		await deactivation;
		assert.deepStrictEqual(order, ["init-start", "init-end", "dispose-start", "dispose-end"]);
	});

	test("mcdev version success is emitted once", async () => {
		const sink = createSink();
		let lookupCalls = 0;
		const versionTelemetry = new McdevVersionTelemetry(sink, async () => {
			lookupCalls += 1;
			return { success: true, stdStreams: { output: "9.2.1\n", error: "" } };
		});
		await Promise.all([versionTelemetry.start(), versionTelemetry.start()]);
		assert.strictEqual(lookupCalls, 1);
		assert.deepStrictEqual(sink.events, [{ event: "mcdev.version", properties: { mcdevVersion: "9.2.1" } }]);
	});

	test("failed mcdev version lookup emits an event without a version", async () => {
		const sink = createSink();
		const versionTelemetry = new McdevVersionTelemetry(sink, async () => ({
			success: false,
			stdStreams: { output: "", error: "missing" }
		}));
		await versionTelemetry.start();
		assert.deepStrictEqual(sink.events, [{ event: "mcdev.version", properties: {} }]);
	});

	test("pending mcdev lookup is awaited when it resolves during shutdown", async () => {
		const sink = createSink();
		let resolveLookup:
			| ((value: { success: boolean; stdStreams: { output: string; error: string } }) => void)
			| undefined;
		const versionTelemetry = new McdevVersionTelemetry(
			sink,
			() =>
				new Promise(resolve => {
					resolveLookup = resolve;
				})
		);
		void versionTelemetry.start();
		const shutdownWait = versionTelemetry.waitForShutdown();
		resolveLookup?.({ success: true, stdStreams: { output: "9.3.0", error: "" } });
		await shutdownWait;
		assert.deepStrictEqual(sink.events, [{ event: "mcdev.version", properties: { mcdevVersion: "9.3.0" } }]);
	});

	test("command result seam emits duration only on success and coarse failure data", () => {
		const sink = createSink();
		trackCommandResult(sink, "retrieve", true, 42);
		trackCommandResult(sink, "deploy", false, 99);
		const thrown = { name: "Error", code: "ENOENT", message: "spawn C:\\Users\\secret\\mcdev" };
		trackCommandResult(sink, "retrieve", false, 12, { error: thrown, errorCategory: "unknown" });
		assert.deepStrictEqual(sink.events, [
			{ event: "command.executed", properties: { command: "retrieve", durationMs: 42 } },
			{ event: "command.failed", properties: { command: "deploy", errorCategory: "commandFailed" } },
			{
				event: "command.failed",
				properties: {
					command: "retrieve",
					errorCategory: "unknown",
					errorName: "Error",
					errorCode: "ENOENT"
				}
			}
		]);
		assert.ok(!("durationMs" in sink.events[1].properties));
		assert.ok(!("message" in sink.events[1].properties));
		assert.ok(!("stack" in sink.events[1].properties));
		assert.ok(!("message" in sink.events[2].properties));
		assert.ok(!("stack" in sink.events[2].properties));
	});

	test("telemetry catalog matches runtime event properties and measures bidirectionally", async () => {
		const fetchStub = stubFetch();
		try {
			const reporter = new TelemetryReporter({ extensionName: "sfmc-devtools", extensionVersion: "9.9.9" });
			reporter.track("extension.activated", {
				isDevToolsProject: true,
				...detectEcosystem("Accenture-oss.sfmc-devtools-vscode")
			});
			reporter.track("mcdev.version", { mcdevVersion: "9.2.1" });
			reporter.track("command.executed", { command: "retrieve", durationMs: 42 });
			reporter.track("command.failed", {
				command: "deploy",
				errorCategory: "commandFailed",
				errorName: "Error",
				errorCode: "ENOENT"
			});
			await reporter.flush();

			const catalogPath = join(__dirname, "..", "..", "..", "telemetry.json");
			const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
				commonProperties: Record<string, unknown>;
				events: Record<string, Record<string, { isMeasurement?: boolean } | string>>;
			};
			const body = JSON.parse(fetchStub.calls[0].body) as { batch: TelemetryEvent[] };
			const commonNames = Object.keys(catalog.commonProperties).sort();
			const runtimeCommon = [
				"$process_person_profile",
				"distinct_id",
				"extension",
				"extensionVersion",
				"os",
				"vscodeVersion"
			].sort();
			assert.deepStrictEqual(commonNames, runtimeCommon);
			assert.deepStrictEqual(Object.keys(catalog.events).sort(), body.batch.map(event => event.event).sort());

			for (const event of body.batch) {
				const definition = catalog.events[event.event] as {
					properties?: Record<string, unknown>;
					measures?: Record<string, unknown>;
				};
				const catalogProperties = Object.keys(definition.properties ?? {}).sort();
				const catalogMeasures = Object.keys(definition.measures ?? {}).sort();
				const runtimeCustom = Object.keys(event.properties).filter(name => !runtimeCommon.includes(name));
				const runtimeMeasures = runtimeCustom.filter(name => typeof event.properties[name] === "number").sort();
				const runtimeProperties = runtimeCustom
					.filter(name => typeof event.properties[name] !== "number")
					.sort();
				assert.deepStrictEqual(runtimeProperties, catalogProperties, `${event.event} properties`);
				assert.deepStrictEqual(runtimeMeasures, catalogMeasures, `${event.event} measures`);
			}
			await reporter.disposeAsync();
		} finally {
			fetchStub.restore();
		}
	});

	test("detectEcosystem reports neighbors and excludes self", () => {
		const selfId = "Accenture-oss.sfmc-devtools-vscode";
		const installed: MockExtension[] = [
			{ id: selfId, packageJSON: {} },
			{ id: "joernberkefeld.sfmc-language", packageJSON: {} },
			{ id: "some.other-extension", packageJSON: { extensionDependencies: [selfId] } }
		];
		extensions.__installed = installed;
		const result = detectEcosystem(selfId);
		assert.strictEqual(result.coInstalledAsDependency, true);
		assert.strictEqual(result["neighbor.sfmc-language"], true);
		assert.strictEqual(Object.prototype.hasOwnProperty.call(result, "neighbor.sfmc-devtools"), false);
	});

	test("ecosystem detects only allowlisted presence regardless of activation", () => {
		const selfId = "Accenture-oss.sfmc-devtools-vscode";
		const requestedNeighbors: Record<string, string> = {
			"neighbor.xnerd.ampscript-language": "xnerd.ampscript-language",
			"neighbor.esbenp.prettier-vscode": "esbenp.prettier-vscode",
			"neighbor.dbaeumer.vscode-eslint": "dbaeumer.vscode-eslint",
			"neighbor.MarketingThibs.ampscriptsnippets": "MarketingThibs.ampscriptsnippets",
			"neighbor.markdown-preview-bitbucket-innersource": "joernberkefeld.markdown-preview-bitbucket-innersource"
		};
		const originalInstalled = extensions.__installed;
		try {
			const ids = Object.values(requestedNeighbors);
			for (const presentIds of [[], ids, ...ids.map(id => [id])]) {
				extensions.__installed = [
					{
						id: selfId,
						isActive: false,
						packageJSON: { extensionDependencies: [selfId], extensionPack: [selfId] }
					},
					{ id: "unrelated.private-extension", isActive: false, packageJSON: {} },
					...presentIds.map(id => ({ id, isActive: false, packageJSON: {} }))
				];
				const result = detectEcosystem(selfId);
				for (const [key, id] of Object.entries(requestedNeighbors)) {
					assert.strictEqual(result[key], presentIds.includes(id), `${key} must match only ${id}`);
				}
				assert.strictEqual(result.coInstalledAsDependency, false, "self dependencies must be excluded");
				assert.strictEqual(result.coInstalledInPack, false, "self packs must be excluded");
				assert.ok(!("neighbor.sfmc-devtools" in result));
				assert.ok(!JSON.stringify(result).includes("unrelated.private-extension"));
				for (const [key, value] of Object.entries(result)) {
					assert.strictEqual(typeof value, "boolean", key);
					if (key.startsWith("neighbor.") && !(key in requestedNeighbors))
						assert.strictEqual(value, false, key);
				}
				assert.strictEqual(
					Object.keys(result).length,
					15,
					"only 13 allowlisted neighbors and two co-installation flags"
				);
			}
			extensions.__installed = [
				{ id: "other.dependency", packageJSON: { extensionDependencies: [selfId] } },
				{ id: "other.pack", packageJSON: { extensionPack: [selfId] } }
			];
			const result = detectEcosystem(selfId);
			assert.strictEqual(result.coInstalledAsDependency, true);
			assert.strictEqual(result.coInstalledInPack, true);
		} finally {
			extensions.__installed = originalInstalled;
		}
	});

	test("DevToolsExtension.init sends extension.activated through the live reporter", async () => {
		const fetchStub = stubFetch();
		try {
			const extension = new DevToolsExtension(makeContext(), { lookupMcdevVersion: idleLookup });
			await extension.init();
			await extension.disposeTelemetry();
			const body = JSON.parse(fetchStub.calls[0].body) as { batch: TelemetryEvent[] };
			const activated = body.batch.find(event => event.event === "extension.activated");
			assert.ok(activated, "extension.activated must reach the live reporter");
			assert.strictEqual(activated.properties.isDevToolsProject, false);
			assert.strictEqual(activated.properties.distinct_id, "mock-machine-id");
			assert.strictEqual(activated.properties.$process_person_profile, false);
		} finally {
			fetchStub.restore();
		}
	});

	test("executeCommand records success duration through the production path", async () => {
		const sink = createSink();
		const executeMcdev: McdevExecute = async () => ({ success: true });
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: idleLookup,
			executeMcdev
		});
		await extension.init();
		primeStatusBar(extension);
		await extension.executeCommand("retrieve", { filesDetails: [] });
		const executed = sink.events.filter(event => event.event === "command.executed");
		assert.strictEqual(executed.length, 1);
		assert.strictEqual(executed[0].properties.command, "retrieve");
		assert.strictEqual(typeof executed[0].properties.durationMs, "number");
		assert.ok(!("errorCategory" in executed[0].properties));
		await extension.disposeTelemetry();
	});

	test("executeCommand records sanitized extras when executeMcdev throws", async () => {
		const sink = createSink();
		const executeMcdev: McdevExecute = async () => {
			throw { name: "Error", code: "ENOENT", message: "spawn C:\\Users\\secret\\mcdev" };
		};
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: idleLookup,
			executeMcdev
		});
		await extension.init();
		primeStatusBar(extension);
		await extension.executeCommand("retrieve", { filesDetails: [] });
		const failed = sink.events.filter(event => event.event === "command.failed");
		assert.deepStrictEqual(failed, [
			{
				event: "command.failed",
				properties: {
					command: "retrieve",
					errorCategory: "unknown",
					errorName: "Error",
					errorCode: "ENOENT"
				}
			}
		]);
		assert.ok(!("message" in failed[0].properties));
		assert.ok(!("stack" in failed[0].properties));
		await extension.disposeTelemetry();
	});

	test("executeCommand records coarse failure only through the production path", async () => {
		const sink = createSink();
		const executeMcdev: McdevExecute = async () => ({ success: false });
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: idleLookup,
			executeMcdev
		});
		await extension.init();
		primeStatusBar(extension);
		await extension.executeCommand("deploy", { filesDetails: [] });
		const failed = sink.events.filter(event => event.event === "command.failed");
		assert.deepStrictEqual(failed, [
			{ event: "command.failed", properties: { command: "deploy", errorCategory: "commandFailed" } }
		]);
		assert.ok(!("durationMs" in failed[0].properties));
		assert.ok(!("message" in failed[0].properties));
		assert.ok(!("stack" in failed[0].properties));
		await extension.disposeTelemetry();
	});

	test("executeCommand skips telemetry when the progress token is cancelled", async () => {
		const sink = createSink();
		const executeMcdev: McdevExecute = async (_command, _handler, _parameters, cancellationToken) => {
			if (cancellationToken) cancellationToken.isCancellationRequested = true;
			return { success: false };
		};
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: idleLookup,
			executeMcdev
		});
		await extension.init();
		primeStatusBar(extension);
		await extension.executeCommand("retrieve", { filesDetails: [] });
		assert.deepStrictEqual(
			sink.events.filter(event => event.event === "command.executed" || event.event === "command.failed"),
			[]
		);
		await extension.disposeTelemetry();
	});

	test("version lookup through init is once-only and reports success", async () => {
		const sink = createSink();
		let lookupCalls = 0;
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: async () => {
				lookupCalls += 1;
				return { success: true, stdStreams: { output: "9.2.1\n", error: "" } };
			}
		});
		await extension.init();
		await extension.disposeTelemetry();
		assert.strictEqual(lookupCalls, 1);
		assert.deepStrictEqual(
			sink.events.filter(event => event.event === "mcdev.version"),
			[{ event: "mcdev.version", properties: { mcdevVersion: "9.2.1" } }]
		);
	});

	test("failed version lookup through init omits mcdevVersion", async () => {
		const sink = createSink();
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: async () => ({ success: false, stdStreams: { output: "", error: "missing" } })
		});
		await extension.init();
		await extension.disposeTelemetry();
		assert.deepStrictEqual(
			sink.events.filter(event => event.event === "mcdev.version"),
			[{ event: "mcdev.version", properties: {} }]
		);
	});

	test("pending version lookup reaches the reporter during production shutdown", async () => {
		const sink = createSink();
		let resolveLookup:
			| ((value: { success: boolean; stdStreams: { output: string; error: string } }) => void)
			| undefined;
		const extension = new DevToolsExtension(makeContext(), {
			createReporter: () => sink,
			lookupMcdevVersion: () =>
				new Promise(resolve => {
					resolveLookup = resolve;
				})
		});
		await extension.init();
		const disposal = extension.disposeTelemetry();
		resolveLookup?.({ success: true, stdStreams: { output: "9.3.0", error: "" } });
		await disposal;
		assert.deepStrictEqual(
			sink.events.filter(event => event.event === "mcdev.version"),
			[{ event: "mcdev.version", properties: { mcdevVersion: "9.3.0" } }]
		);
		assert.strictEqual(sink.disposeCalls, 1);
	});

	test("exported activate/deactivate awaits the production telemetry drain", async () => {
		let resolveDrain: (() => void) | undefined;
		let reachedDrain = false;
		let finished = false;
		const reporter = {
			track() {},
			async disposeAsync() {
				reachedDrain = true;
				await new Promise<void>(resolve => {
					resolveDrain = resolve;
				});
			}
		};
		await activate(makeContext(), {
			createReporter: () => reporter,
			lookupMcdevVersion: idleLookup
		});
		const done = deactivate().then(() => {
			finished = true;
		});
		for (let spins = 0; !reachedDrain && spins < 100; spins++) await Promise.resolve();
		assert.ok(reachedDrain, "deactivate must reach the reporter drain");
		assert.strictEqual(finished, false, "deactivate must wait for the reporter drain");
		resolveDrain?.();
		await done;
		assert.strictEqual(finished, true);
	});
});
