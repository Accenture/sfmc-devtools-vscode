import { sanitizeFailureTelemetry } from "./errorTelemetry";
import type { TelemetryValue } from "./telemetry";

interface TelemetrySink {
	track(event: string, props?: Record<string, TelemetryValue>): void;
}

export interface CommandFailureDetails {
	error?: unknown;
	errorCategory?: string;
}

/** Records the privacy-safe telemetry shape for a completed mcdev command result. */
export function trackCommandResult(
	reporter: TelemetrySink | undefined,
	command: string,
	success: boolean,
	durationMs: number,
	failure?: CommandFailureDetails
): void {
	if (success) {
		reporter?.track("command.executed", { command, durationMs });
		return;
	}
	reporter?.track("command.failed", {
		command,
		...sanitizeFailureTelemetry(failure?.error, failure?.errorCategory ?? "commandFailed")
	});
}
