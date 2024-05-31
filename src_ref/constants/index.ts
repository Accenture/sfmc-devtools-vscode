enum Confirmation {
	Yes = "yes",
	No = "no"
}

enum RecommendedExtensionsOptions {
	"Install" = "install",
	"Not Now" = "not now",
	"Do not show again" = "do not show again"
}

enum StatusBarIcon {
	success = "check-all",
	retrieve = "cloud-download",
	deploy = "cloud-upload",
	error = "warning",
	copy_to_folder = "file-symlink-directory",
	info = "extensions-info-message"
}

export { Confirmation, RecommendedExtensionsOptions, StatusBarIcon };
