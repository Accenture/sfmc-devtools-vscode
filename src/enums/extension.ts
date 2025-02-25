/**
 * Confirmation User Options
 *
 * @enum {number}
 */
enum Confirmation {
	Yes = "yes",
	No = "no"
}

/**
 * Recommended Extensions User options
 *
 * @enum {number}
 */
enum RecommendedExtensionsOptions {
	"Install" = "install",
	"Not Now" = "not now",
	"Do not show again" = "do not show again"
}

/**
 * Status Bar Icon Options
 *
 * @enum {number}
 */
enum StatusBarIcon {
	success = "check-all",
	retrieve = "cloud-download",
	deploy = "cloud-upload",
	error = "warning",
	copytobu = "file-symlink-directory",
	info = "extensions-info-message",
	delete = "trash",
	clone = "copy"
}

/**
 * Logger Level Options
 *
 * @enum {number}
 */
enum LoggerLevel {
	DEBUG = "debug",
	INFO = "info",
	OUTPUT = "output",
	WARN = "warn",
	ERROR = "error"
}

export { Confirmation, RecommendedExtensionsOptions, StatusBarIcon, LoggerLevel };
