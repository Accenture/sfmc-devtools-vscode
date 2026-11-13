const runningCommand = "Running DevTools command...";
const runningCommandSuccess = "DevTools command has run successfully!";
const runningCommandCancelled = (command: string) => `DevTools command has been cancelled: ${command}`;
const projectUpgradeAction = "Run mcdev upgrade";
const projectUpgradeConfirmAction = "Coordinated — run upgrade";
const projectUpgradeRequired = (projectPath: string, configVersion: string, cliVersion: string) =>
	`Project configuration needs upgrading at ${projectPath}. Project config version: ${configVersion}. mcdev CLI version: ${cliVersion}. Would you like the extension to run mcdev upgrade?`;
const projectUpgradeConfirmation = (projectPath: string) =>
	`Run mcdev upgrade at ${projectPath}? This can overwrite configuration and tooling, update dependencies, and affect teammates and pending deployments. Save or commit existing work first to establish a recoverable Git baseline. Confirm that you have coordinated this upgrade with the repository owner or tech lead. Failed or cancelled upgrades may leave partial changes. Reverting requires manual recovery via Git; the extension provides no rollback or undo and never runs Git recovery commands.`;
const projectUpgradeFailure =
	"mcdev upgrade did not complete successfully and may have left partial changes. Review the output and working tree. Reverting requires manual recovery via Git; the extension provides no rollback or undo and never runs Git recovery commands.";
const runningCommandFailure = "Oh no. Something went wrong while running DevTools Command...";
const credentialPrompt = "Please select the credential you would like to use:";
const businessUnitsPrompt = "Please select the business unit you would like to use:";
/** Quick-pick title when selecting `--buFrom` during Build (templating). */
const businessUnitsFromPrompt = "Please select the BU you would like to use as source:";
/** Quick-pick title when selecting `--buTo` during Build (templating). */
const businessUnitsToPrompt = "Please select the BU you would like to use as target:";
const metaDataTypePrompt = "Please select the metadata types you would like to use:";
const copyToBuPrompt = "Please select the action you would like to perform:";
const changeKeyMethodPrompt = "Please select how you would like to change the key:";
const changeKeyMixedTypesError = (metadataTypes: string[]) =>
	`Please select files of the same metadata type to use Change Key by field. Selected types: ${metadataTypes.join(", ")}`;
const changeKeyFieldListPrompt = "Please select the field to use as the new key:";
const changeKeyFieldPrompt =
	"Please enter the field name to use as the new key (must match exact spelling, including casing):";
const changeKeyValuePrompt = "Please enter the new key value:";
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
const unsupportedAction = (action: string, metadataTypes: string[]) =>
	`The selected metadata type${metadataTypes.length > 1 ? "s do" : " does"} not support "${action}": ${metadataTypes.join(", ")}`;
const buildPurgePrompt = "Clear deploy folder before building?";
const buildPurgeOptionYes = "Yes, clear deploy folder before building";
const buildPurgeOptionNo = "No, keep existing deploy folder";

export {
	projectUpgradeAction,
	projectUpgradeConfirmAction,
	projectUpgradeConfirmation,
	projectUpgradeFailure,
	projectUpgradeRequired,
	runningCommand,
	runningCommandSuccess,
	runningCommandCancelled,
	runningCommandFailure,
	credentialPrompt,
	businessUnitsPrompt,
	businessUnitsFromPrompt,
	businessUnitsToPrompt,
	metaDataTypePrompt,
	copyToBuPrompt,
	changeKeyMethodPrompt,
	changeKeyMixedTypesError,
	changeKeyFieldListPrompt,
	changeKeyFieldPrompt,
	changeKeyValuePrompt,
	noCredentialFound,
	deleteConfirmation,
	noBusinessUnitsFound,
	unsupportedAction,
	buildPurgePrompt,
	buildPurgeOptionYes,
	buildPurgeOptionNo
};
