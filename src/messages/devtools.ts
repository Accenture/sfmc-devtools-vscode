const noMcdevInstalled =
	"It appears that DevTools package 'mcdev' is not installed on your system. Would you like to install it?";
const mcdevInstallLoading = "Installing DevTools 'mcdev' package...";
const mcdevInstallSuccess = "DevTools mcdev package has been successfully installed!";
const mcdevInstallError = "Something went wrong! Installation of DevTools mcdev package has failed.";
const mcdevConfigFile = "DevTools config file at";
const mcdevRunningCommand = "Running DevTools Command:";
const mcdevUnsupportedMetadataTypes = (action: string, metadataTypes: string[]): string =>
	`Currently DevTools doesn't support ${action} action for the following metadata types: ${metadataTypes.join(", ")}`;

const mcdevDeleteCommandSplit = (totalRuns: number): string =>
	`Selected files exceed the maximum command-line length. The delete command will be executed ${totalRuns} times to process all files.`;

export {
	noMcdevInstalled,
	mcdevInstallLoading,
	mcdevInstallSuccess,
	mcdevInstallError,
	mcdevConfigFile,
	mcdevRunningCommand,
	mcdevUnsupportedMetadataTypes,
	mcdevDeleteCommandSplit
};
