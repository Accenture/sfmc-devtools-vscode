const recommendedExtensions =
	"There are some recommended extensions that can enhance your usage of SFMC DevTools. Would you like to install them?";
const runningCommand = "Running DevTools command...";
const runningCommandSuccess = "DevTools command has run successfully!";
const runningCommandFailure = "Oh no. Something went wrong while running DevTools Command...";
const copyToBuPrompt = "Please select the action you would like to perform:";
const deleteConfirmation = (items: string[]) =>
	`Are you sure you want to delete the selected item${items.length > 1 ? "s" : ""} from the server?\n\n${items
		.slice(0, 3)
		.map(item => `Delete: ${item}`)
		.join(
			"\n"
		)}${items.length > 3 ? `\n...and ${items.length - 3} more item${items.length - 3 > 1 ? "s" : ""}.` : ""}`;

export {
	recommendedExtensions,
	runningCommand,
	runningCommandSuccess,
	runningCommandFailure,
	copyToBuPrompt,
	deleteConfirmation
};
