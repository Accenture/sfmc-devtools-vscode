const mcdevNotInstalledPrompt =
	"DevTools package 'mcdev' is not installed on your system. Would you like to install it?";
const mcdevOutdatedPrompt = "DevTools 'mcdev' package is outdated. Would you like to update it?";
const mcdevProjectOutdatedPrompt = "Your project's config version is outdated. Would you like to update it?";
const mcdevInstallLoading = "Installing DevTools 'mcdev' package...";
const mcdevInstallSuccess = "DevTools 'mcdev' package has been successfully installed!";
const mcdevInstallError = "Something went wrong! Installation of DevTools 'mcdev' package has failed.";
const mcdevConfigFile = "DevTools config file at";
const mcdevUpdateProjectConfig = "Updating project config file at";
const mcdevUpdateProjectConfigLoading = "Updating project config file...";
const mcdevRunningCommand = "Running DevTools Command:";
const mcdevUnsupportedMetadataTypes = (action: string, metadataTypes: string[]): string =>
	`Currently DevTools doesn't support ${action} action for the following metadata types: ${metadataTypes.join(", ")}`;

export {
	mcdevNotInstalledPrompt,
	mcdevOutdatedPrompt,
	mcdevProjectOutdatedPrompt,
	mcdevInstallLoading,
	mcdevInstallSuccess,
	mcdevInstallError,
	mcdevConfigFile,
	mcdevUpdateProjectConfig,
	mcdevUpdateProjectConfigLoading,
	mcdevRunningCommand,
	mcdevUnsupportedMetadataTypes
};
