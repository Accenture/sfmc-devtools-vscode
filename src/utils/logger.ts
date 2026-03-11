import * as fs from "fs";
import * as path from "path";

const vsceLogsFolder = path.join("logs", "vsce");
const vsceLogSuffix = "-vsce.log";

/**
 * Generates a log file timestamp in the format 2026-02-05T16.16.28.062Z
 * (ISO 8601 with colons replaced by dots so the name is valid on all OSes)
 *
 * @returns {string} formatted timestamp
 */
function getLogFileTimestamp(): string {
	return new Date().toISOString().replace(/:/g, ".");
}

/**
 * VsceLogger – writes VSCE extension debug/error logs to a file under
 * `{projectPath}/logs/vsce/{timestamp}-vsce.log`.
 *
 * Usage pattern:
 *   1. Call `startSession(projectPath)` at the start of a command execution.
 *   2. Call `write(message, isError)` for every log entry that should be recorded.
 *   3. Call `endSession(success)` when the command finishes.

 *      – If `success` is true and no errors were recorded the log file is
 *        deleted automatically, keeping the folder clean for happy-path runs.
 *
 * @class VsceLogger
 */
class VsceLogger {
	/**
	 * Absolute path of the currently active log file, or `undefined` when no
	 * session is running.
	 *
	 * @private
	 * @type {string | undefined}
	 */
	private logFilePath: string | undefined;

	/**
	 * Whether an error or warning was written during the current session.
	 * Used to decide whether the log file should be kept after a successful run.
	 *
	 * @private
	 * @type {boolean}
	 */
	private hasErrors = false;

	/**
	 * Starts a new log session by creating the log file under
	 * `{projectPath}/logs/vsce/`.
	 * If the directory does not exist it is created recursively.
	 * Silently skips file creation on any OS-level error so that a missing
	 * logs folder never prevents the extension from working.
	 *
	 * @param {string} projectPath - absolute path of the MCDEV project (workspace root)
	 * @returns {void}
	 */
	startSession(projectPath: string): void {
		try {
			const logsDir = path.join(projectPath, vsceLogsFolder);
			if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
			const fileName = `${getLogFileTimestamp()}${vsceLogSuffix}`;
			this.logFilePath = path.join(logsDir, fileName);
			// Touch the log file so it exists even if no log entries are written
			fs.writeFileSync(this.logFilePath, `# VSCE log session started at ${new Date().toISOString()}\n`, {
				flag: "a"
			});
			this.hasErrors = false;
		} catch {
			// If the log directory or file cannot be created, continue without file logging
			this.logFilePath = undefined;
		}
	}

	/**
	 * Appends a log entry to the active log file.
	 * Does nothing when no session is active.
	 *
	 * @param {string} message - formatted log message (already contains timestamp and level prefix)
	 * @param {boolean} isError - true when the log level is ERROR or WARN
	 * @returns {void}
	 */
	write(message: string, isError: boolean): void {
		if (!this.logFilePath) return;
		if (isError) this.hasErrors = true;
		try {
			fs.appendFileSync(this.logFilePath, `${message}\n`);
		} catch {
			// Silently ignore write errors
		}
	}

	/**
	 * Ends the current log session.
	 * When `success` is `true` and no errors/warnings were recorded the log
	 * file is deleted so that clean runs leave no artifacts behind.
	 * In all other cases the file is kept for post-mortem debugging.
	 *
	 * @param {boolean} success - whether the command execution succeeded without VSCE errors
	 * @returns {void}
	 */
	endSession(success: boolean): void {
		if (!this.logFilePath) return;
		if (success && !this.hasErrors) {
			try {
				fs.unlinkSync(this.logFilePath);
			} catch {
				// Silently ignore deletion errors
			}
		}
		this.logFilePath = undefined;
		this.hasErrors = false;
	}
}

export { VsceLogger };
