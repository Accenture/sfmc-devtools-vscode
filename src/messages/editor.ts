const recommendedExtensions =
	"There are some recommended extensions that can enhance your usage of SFMC DevTools. Would you like to install them?";
const runningCommand = "Running DevTools command...";
const runningCommandSuccess = "DevTools command has run successfully!";
const runningCommandFailure = "Oh no. Something went wrong while running DevTools Command...";
const deleteConfirmation = (items: string[]) =>
	`Are you sure you want to delete the selected item${items.length > 1 ? "s" : ""} from the server?\n\n${items
		.slice(0, 3)
		.map(item => `Delete: ${item}`)
		.join(
			"\n"
		)}${items.length > 3 ? `\n...and ${items.length - 3} more item${items.length - 3 > 1 ? "s" : ""}.` : ""}`;
const buildBulkRequestMessage = "Do you want to build your templates for multiple business units?";
const buildDependenciesRequestMessage = "Do you want to add dependencies to your build templates?";
const buildConfigRequestMessage = (key: string) => `Please select one option from the ${key} list:`;
const buildConfigUndefinedMessage = (key: string) => `DevTools config file property '${key}' is not configured.`;
export {
	recommendedExtensions,
	runningCommand,
	runningCommandSuccess,
	runningCommandFailure,
	deleteConfirmation,
	buildBulkRequestMessage,
	buildDependenciesRequestMessage,
	buildConfigUndefinedMessage,
	buildConfigRequestMessage
};
