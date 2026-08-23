/**
 * Privacy-safe failure properties for catch → track telemetry.
 * Never includes message, stack, file paths, or other free-form text.
 */

export interface FailureTelemetryProperties {
	errorCategory: string;
	errorName?: string;
	errorCode?: string;
}

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,47}$/;
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const MAX_NUMERIC_CODE = 99_999;

/**
 * Accepts only a short Error constructor name (TypeError, FileSystemError).
 * @param name - candidate `error.name`
 * @returns the name, or undefined when it is not a safe identifier
 */
export function sanitizeErrorName(name: unknown): string | undefined {
	if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
		return undefined;
	}
	return name;
}

/**
 * Accepts a VS Code / Node error code (`ENOENT`, `FileNotFound`) or a small
 * non-negative integer (exit codes). Always returned as a string.
 * @param code - candidate `error.code` or process exit code
 * @returns the sanitized code, or undefined
 */
export function sanitizeErrorCode(code: unknown): string | undefined {
	if (typeof code === "number" && Number.isSafeInteger(code) && code >= 0 && code <= MAX_NUMERIC_CODE) {
		return String(code);
	}
	if (typeof code === "string" && CODE_PATTERN.test(code)) {
		return code;
	}
	return undefined;
}

/**
 * Maps an unknown thrown value onto the closed failure-telemetry shape.
 * @param error - caught value; inspected only for `name` and `code`
 * @param errorCategory - caller-chosen closed-enum bucket
 * @returns properties safe to send on a `failed` event
 */
export function sanitizeFailureTelemetry(error: unknown, errorCategory: string): FailureTelemetryProperties {
	const properties: FailureTelemetryProperties = { errorCategory };
	if (error && typeof error === "object") {
		const name = sanitizeErrorName((error as { name?: unknown }).name);
		if (name) {
			properties.errorName = name;
		}
		const code = sanitizeErrorCode((error as { code?: unknown }).code);
		if (code) {
			properties.errorCode = code;
		}
	}
	return properties;
}
