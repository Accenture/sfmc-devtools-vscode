import * as vscode from "vscode";

const PROJECT_API_KEY = "phc_AY9WHA5c6M9QqkaapgPqSTZ2NNZK3L3FxwkbdASsS7Ex";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const FLUSH_DEBOUNCE_MS = 2000;
const SHUTDOWN_TIMEOUT_MS = 2000;

export type TelemetryValue = string | number | boolean;

interface TelemetryReporterOptions {
	extensionName: string;
	extensionVersion: string;
}

interface QueuedEvent {
	event: string;
	properties: Record<string, TelemetryValue>;
	timestamp: string;
}

/**
 * Batches anonymous extension telemetry and respects VS Code's global telemetry setting.
 */
export class TelemetryReporter implements vscode.Disposable {
	private readonly commonProps: Record<string, TelemetryValue>;
	private readonly distinctId: string;
	private readonly inFlight = new Map<AbortController, Promise<void>>();
	private queue: QueuedEvent[] = [];
	private flushTimer: ReturnType<typeof setTimeout> | undefined;
	private enabled: boolean;
	private disposed = false;
	private disposePromise: Promise<void> | undefined;
	private readonly changeSubscription: vscode.Disposable;

	/**
	 * @param options - The emitting extension's short name and own version.
	 */
	constructor(options: TelemetryReporterOptions) {
		this.distinctId = vscode.env.machineId;
		this.enabled = vscode.env.isTelemetryEnabled;
		this.commonProps = {
			extension: options.extensionName,
			extensionVersion: options.extensionVersion,
			os: process.platform,
			vscodeVersion: vscode.version
		};
		this.changeSubscription = vscode.env.onDidChangeTelemetryEnabled(isEnabled => {
			this.enabled = isEnabled;
			if (!isEnabled) {
				this.clearPending();
				this.abortInFlight();
			}
		});
	}

	/**
	 * Enqueues an event for the next debounced flush.
	 * @param event - Event name catalogued in telemetry.json.
	 * @param props - Optional flat custom properties.
	 */
	track(event: string, props?: Record<string, TelemetryValue>): void {
		if (this.disposed || !this.enabled) return;

		this.queue.push({
			event,
			properties: {
				distinct_id: this.distinctId,
				$process_person_profile: false,
				...this.commonProps,
				...(props ?? {})
			},
			timestamp: new Date().toISOString()
		});
		if (!this.flushTimer) {
			this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DEBOUNCE_MS);
		}
	}

	/**
	 * Sends queued events now. Callers on normal paths intentionally do not await this promise.
	 * @returns A promise settled when this flush's request settles.
	 */
	flush(): Promise<void> {
		return this.flushQueued(false);
	}

	/**
	 * Performs a bounded final drain for explicit extension deactivation.
	 * @returns A promise that settles after requests complete or the shutdown bound expires.
	 */
	disposeAsync(): Promise<void> {
		if (this.disposePromise) return this.disposePromise;
		if (this.disposed) return Promise.resolve();

		this.disposed = true;
		this.changeSubscription.dispose();
		this.disposePromise = this.drainForShutdown();
		return this.disposePromise;
	}

	/** Immediately stops telemetry when disposed through VS Code's synchronous Disposable path. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.changeSubscription.dispose();
		this.clearPending();
		this.abortInFlight();
	}

	private async drainForShutdown(): Promise<void> {
		const existingRequests = [...this.inFlight.values()];
		const finalRequest = this.flushQueued(true);
		const requests = [...existingRequests, finalRequest];
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<void>(resolve => {
			timeout = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
		});

		await Promise.race([Promise.allSettled(requests).then(() => undefined), timeoutPromise]);
		if (timeout) clearTimeout(timeout);
		if (this.inFlight.size > 0) this.abortInFlight();
		await Promise.allSettled([...this.inFlight.values()]);
	}

	private flushQueued(allowDisposed: boolean): Promise<void> {
		this.clearFlushTimer();
		if (
			(!allowDisposed && this.disposed) ||
			!this.enabled ||
			!vscode.env.isTelemetryEnabled ||
			this.queue.length === 0
		) {
			if (!this.enabled || !vscode.env.isTelemetryEnabled) this.queue = [];
			return Promise.resolve();
		}
		if (typeof fetch !== "function") {
			this.queue = [];
			return Promise.resolve();
		}

		const batch = this.queue;
		this.queue = [];
		const controller = new AbortController();
		const request = fetch(`${POSTHOG_HOST}/batch/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ api_key: PROJECT_API_KEY, batch }),
			signal: controller.signal
		})
			.then(() => undefined)
			.catch(() => undefined)
			.finally(() => {
				this.inFlight.delete(controller);
			});
		this.inFlight.set(controller, request);
		return request;
	}

	private clearPending(): void {
		this.queue = [];
		this.clearFlushTimer();
	}

	private clearFlushTimer(): void {
		if (!this.flushTimer) return;
		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
	}

	private abortInFlight(): void {
		for (const controller of this.inFlight.keys()) controller.abort();
	}
}

const NEIGHBOR_ALLOWLIST: Record<string, string> = {
	"neighbor.xnerd.ampscript-language": "xnerd.ampscript-language",
	"neighbor.esbenp.prettier-vscode": "esbenp.prettier-vscode",
	"neighbor.dbaeumer.vscode-eslint": "dbaeumer.vscode-eslint",
	"neighbor.MarketingThibs.ampscriptsnippets": "MarketingThibs.ampscriptsnippets",
	"neighbor.sergey-agadzhanov.ampscript": "sergey-agadzhanov.ampscript",
	"neighbor.FiB.ssjs-vsc": "FiB.ssjs-vsc",
	"neighbor.FiB.beautyAmp": "FiB.beautyAmp",
	"neighbor.sfmc-language": "joernberkefeld.sfmc-language",
	"neighbor.sfmc-devtools": "Accenture-oss.sfmc-devtools-vscode",
	"neighbor.sfmc-data": "joernberkefeld.sfmc-data",
	"neighbor.mso-conditionals": "joernberkefeld.mso-conditionals",
	"neighbor.sfmc-extension-pack": "joernberkefeld.sfmc-extension-pack",
	"neighbor.sfmc-extension-pack-plus": "joernberkefeld.sfmc-extension-pack-expanded",
	"neighbor.markdown-preview-bitbucket-innersource": "joernberkefeld.markdown-preview-bitbucket-innersource"
};

/**
 * Computes flat ecosystem and co-installation booleans.
 * @param selfId - Full publisher.name id of the calling extension.
 * @returns Flat telemetry properties.
 */
export function detectEcosystem(selfId: string): Record<string, boolean> {
	const result: Record<string, boolean> = {};
	let coInstalledAsDependency = false;
	let coInstalledInPack = false;
	for (const ext of vscode.extensions.all) {
		if (ext.id === selfId) continue;
		const pkg = ext.packageJSON as { extensionDependencies?: string[]; extensionPack?: string[] };
		if (Array.isArray(pkg.extensionDependencies) && pkg.extensionDependencies.includes(selfId)) {
			coInstalledAsDependency = true;
		}
		if (Array.isArray(pkg.extensionPack) && pkg.extensionPack.includes(selfId)) coInstalledInPack = true;
	}
	result.coInstalledAsDependency = coInstalledAsDependency;
	result.coInstalledInPack = coInstalledInPack;

	for (const label of Object.keys(NEIGHBOR_ALLOWLIST)) {
		const fullId = NEIGHBOR_ALLOWLIST[label];
		if (fullId === selfId) continue;
		result[label] = vscode.extensions.getExtension(fullId) !== undefined;
	}
	return result;
}
