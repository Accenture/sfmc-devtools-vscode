const recommendedExtensions =
	"There are some recommended extensions that can enhance your usage of SFMC DevTools. Would you like to install them?";
const runningCommand = "Running DevTools command...";
const runningCommandSuccess = "DevTools command has run successfully!";
const runningCommandFailure = "Oh no. Something went wrong while running DevTools Command...";
const credentialPrompt = "Please select the credential you would like to use:";
const businessUnitsPrompt = "Please select the business unit you would like to use:";
const metaDataTypePrompt = "Please select the metadata types you would like to use:";
const copyToBuPrompt = "Please select the action you would like to perform:";
const noCredentialFound = "No credentials were found in the configuration file. Please check the configuration file.";
const deleteConfirmation = (items: string[]) =>
	`Are you sure you want to delete the selected item${items.length > 1 ? "s" : ""} from the server?\n\n${items
		.slice(0, 3)
		.map(item => `Delete: ${item}`)
		.join(
			"\n"
		)}${items.length > 3 ? `\n...and ${items.length - 3} more item${items.length - 3 > 1 ? "s" : ""}.` : ""}`;
const noBusinessUnitsFound = (credential: string) =>
	`No business units were found for the selected credential: "${credential}". Please check the configuration file.`;

export {
	recommendedExtensions,
	runningCommand,
	runningCommandSuccess,
	runningCommandFailure,
	credentialPrompt,
	businessUnitsPrompt,
	metaDataTypePrompt,
	copyToBuPrompt,
	noCredentialFound,
	deleteConfirmation,
	noBusinessUnitsFound
};
