import type { TelemetryValue } from "./telemetry";

interface TelemetrySink {
	track(event: string, props?: Record<string, TelemetryValue>): void;
}

/** Records the privacy-safe telemetry shape for a completed mcdev command result. */
export function trackCommandResult(
	reporter: TelemetrySink | undefined,
	command: string,
	success: boolean,
	durationMs: number
): void {
	if (success) {
		reporter?.track("command.executed", { command, durationMs });
	} else {
		reporter?.track("command.failed", { command, errorCategory: "commandFailed" });
	}
}
