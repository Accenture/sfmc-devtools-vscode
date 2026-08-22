import type { TelemetryValue } from "./telemetry";

interface CommandResult {
	success: boolean;
	stdStreams: { output: string; error: string };
}

interface TelemetrySink {
	track(event: string, props?: Record<string, TelemetryValue>): void;
}

/** Runs and caches the mcdev version telemetry lookup for one extension session. */
export class McdevVersionTelemetry {
	private lookupPromise: Promise<void> | undefined;

	constructor(
		private readonly reporter: TelemetrySink,
		private readonly lookup: () => Promise<CommandResult>
	) {}

	/** Starts the lookup once and returns the shared completion promise. */
	start(): Promise<void> {
		this.lookupPromise ??= this.run();
		return this.lookupPromise;
	}

	/** Waits briefly for an already-started lookup during shutdown. */
	async waitForShutdown(timeoutMs = 500): Promise<void> {
		if (!this.lookupPromise) return;
		await Promise.race([
			this.lookupPromise,
			new Promise<void>(resolve => {
				setTimeout(resolve, timeoutMs);
			})
		]);
	}

	private async run(): Promise<void> {
		const props: { mcdevVersion?: string } = {};
		try {
			const result = await this.lookup();
			const mcdevVersion = result.success ? result.stdStreams.output.trim() : "";
			if (mcdevVersion) props.mcdevVersion = mcdevVersion;
		} catch {
			// A missing or failed CLI lookup is represented by an omitted mcdevVersion property.
		}
		this.reporter.track("mcdev.version", props);
	}
}
