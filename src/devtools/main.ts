import { mainConfig } from "../config/main.config";
import { InstallDevToolsResponseOptions } from "../config/installer.config";
import DevToolsCommands from "./commands/DevToolsCommands";
import { PrerequisitesInstalledReturn, devtoolsPrerequisites } from "./prerequisites";
import { devtoolsInstaller } from "./installer";
import { devtoolsContainers, StatusBarIcon } from "./containers";
import { editorInput } from "../editor/input";
import { editorContext } from "../editor/context";
import { editorWorkspace } from "../editor/workspace";
import { editorOutput, log } from "../editor/output";
import { editorDependencies } from "../editor/dependencies";
import InputOptionsSettings from "../shared/interfaces/inputOptionsSettings";
import DevToolsCommandSetting from "../shared/interfaces/devToolsCommandSetting";
import DevToolsPathComponents from "../shared/interfaces/devToolsPathComponents";
import { lib } from "../shared/utils/lib";
import { file } from "../shared/utils/file";

async function initDevToolsExtension(): Promise<void> {
	try {
		log("info", "Running SFMC DevTools extension...");

		editorDependencies.activateExtensionDependencies(mainConfig.extensionsDependencies);

		// activate the status bar
		devtoolsContainers.activateStatusBar();

		// activate the context menus options
		devtoolsContainers.activateContextMenuCommands();

		// If it's already a mcdev project it will check if prerequisites and devtools are installed
		if (await isADevToolsProject()) {
			await handleDevToolsRequirements();
		} else {
			// activate status bar immediately when isDevToolsProject is false
			// devtoolsContainers.activateStatusBar(false, DevToolsCommands.commandPrefix);
			if (await anySubFolderIsDevToolsProject()) {
				// init DevTools Commands
				DevToolsCommands.init(editorWorkspace.getWorkspaceURIPath());
			}
		}
	} catch (error) {
		log("error", `[main_initDevToolsExtension] Error: ${error}`);
	}
}

async function isADevToolsProject(projectName?: string): Promise<boolean> {
	log("debug", "Checking if folder is a SFMC DevTools project...");
	log("debug", `DevTools files: [${mainConfig.requiredFiles}]`);

	const findMcdevFiles: boolean[] = await Promise.all(
		mainConfig.requiredFiles.map(async (filename: string) =>
			editorWorkspace.isFileInFolder(`${projectName || ""}${filename}`)
		)
	);
	log(
		"debug",
		`Folder ${
			findMcdevFiles.every((result: boolean) => result === true) ? "is" : "is not"
		} a SFMC DevTools project.`
	);
	return findMcdevFiles.every((result: boolean) => result === true);
}

async function handleDevToolsRequirements(/*isDevToolsProject: boolean*/): Promise<void> {
	log("info", "Checking SFMC DevTools requirements...");
	const prerequisites: PrerequisitesInstalledReturn = await devtoolsPrerequisites.arePrerequisitesInstalled();
	log("info", `SFMC Pre-Requisites ${prerequisites.prerequisitesInstalled ? "are" : "are not"} installed.`);
	if (prerequisites.prerequisitesInstalled) {
		const isDevToolsInstalled: boolean = await devtoolsInstaller.isDevToolsInstalled();
		if (!isDevToolsInstalled) {
			await devtoolsInstaller.noDevToolsHandler();
			return;
		}
		log("info", "SFMC DevTools is installed.");

		// Needs to check if it's a DevTools Project or not
		// if(isDevToolsProject){
		//     // activate status bar immediately when isDevToolsProject is true
		//     devtoolsContainers.activateStatusBar(true, DevToolsCommands.commandPrefix);
		// }

		// init DevTools Commands
		DevToolsCommands.init(editorWorkspace.getWorkspaceURIPath());
		return;
	}
	log("debug", `Missing Pre-requisites: [${prerequisites.missingPrerequisites}]`);
	devtoolsPrerequisites.noPrerequisitesHandler(editorContext.get().extensionPath, prerequisites.missingPrerequisites);
}

async function anySubFolderIsDevToolsProject(): Promise<boolean> {
	const subFolders: string[] = await editorWorkspace.getWorkspaceSubFolders();
	if (subFolders.length) {
		const subFolderProjects: boolean[] = await Promise.all(
			subFolders.map(async (sf: string) => await isADevToolsProject(sf + "/"))
		);
		return subFolderProjects.some((sfResult: boolean) => sfResult);
	} else {
		log("debug", "Workspace doesn't contain any sub folders.");
	}
	return false;
}

function handleStatusBarActions(action: string): void {
	log("debug", "Setting Status Bar Actions...");
	log("debug", `Action: ${action}`);
	switch (action.toLowerCase()) {
		case "sbcredentialbu":
			changeCredentialsBU();
			break;
		case "sbcommand":
			handleDevToolsSBCommand();
			break;
		case "sbinitialize":
			initialize();
			break;
		case "sbmcdev":
			handleMCDevSBCommand();
			break;
		default:
			log("error", `main_handleStatusBarActions: Invalid Status Bar Action '${action}'`);
	}
}

function handleContextMenuActions(action: string, selectedFiles: string[]): void {
	devtoolsContainers.modifyStatusBar("mcdev", "success");

	log("debug", "Setting Context Menu Actions...");
	log("debug", `Action: ${action} Number of Selected Files: ${selectedFiles.length}`);
	switch (action.toLowerCase()) {
		case "cmretrieve":
			handleDevToolsCMCommand("retrieve", selectedFiles);
			break;
		case "cmdeploy":
			handleDevToolsCMCommand("deploy", selectedFiles);
			break;
		case "cmcopytobu":
			handleCopyToBuCMCommand(selectedFiles);
			break;
		default:
			log("error", `main_handleContextMenuActions: Invalid Context Menu Action '${action}'`);
	}
}

async function getCredentialsBU(): Promise<{ [key: string]: string[] } | undefined> {
	try {
		// gets the project workspace uri path
		const folderPath: string = editorWorkspace.getWorkspaceURIPath();

		// retrieves all the content inside the file that contains the mcdev credentials
		const credBUContent: string = await editorWorkspace.readFile(`${folderPath}/${mainConfig.credentialsFilename}`);

		// parses the content from text to JSON
		const parsedCredBUContent: any = JSON.parse(credBUContent);

		// return a json with each credential associated with a list of its business units
		if (parsedCredBUContent && "credentials" in parsedCredBUContent) {
			return Object.keys(parsedCredBUContent.credentials).reduce((prev: {}, credential: string) => {
				const { businessUnits } = parsedCredBUContent.credentials[credential];
				if (businessUnits && Object.keys(businessUnits).length) {
					return { ...prev, [credential]: Object.keys(businessUnits) };
				} else {
					log("error", `Could not find any business units for the credential '${credential}'`);
					return { ...prev };
				}
			}, {});
		}
		log(
			"error",
			`[main_getCredentialsBU] Error: Could not find any credentials in the '${mainConfig.credentialsFilename}' file.`
		);
	} catch (error) {
		log("error", `[main_getCredentialsBU] Error: ${error}`);
	}
	return;
}

async function changeCredentialsBU(): Promise<void> {
	log("info", "Changing SFMC DevTools credententials/bu...");
	const credentialsBUList: { [key: string]: string[] } | undefined = await getCredentialsBU();

	if (credentialsBUList) {
		// Configures all placeholder as an selectable option
		const allPlaceholderOption: InputOptionsSettings = {
			id: mainConfig.allPlaceholder.toLowerCase(),
			label: mainConfig.allPlaceholder,
			detail: ""
		};
		// Configures all credential names as selectable options
		const credentialsOptions: InputOptionsSettings[] = Object.keys(credentialsBUList).map((credential: string) => ({
			id: credential.toLowerCase(),
			label: credential,
			detail: ""
		}));

		// Requests user to select one credential option
		const selectedCredential: InputOptionsSettings | InputOptionsSettings[] | undefined =
			await editorInput.handleQuickPickSelection(
				[allPlaceholderOption, ...credentialsOptions],
				mainConfig.messages.selectCredential,
				false
			);

		if (selectedCredential && !Array.isArray(selectedCredential)) {
			log("debug", `User selected '${selectedCredential.label}' credential.`);
			if (selectedCredential.id === mainConfig.allPlaceholder.toLowerCase()) {
				// if user selects *All* then status bar should be replaced with it
				// devtoolsContainers.modifyStatusBar(
				//     "credentialbu",
				//     DevToolsCommands.commandPrefix,
				//     selectedCredential.label
				// );
			} else {
				const businessUnitsList: string[] = credentialsBUList[selectedCredential.label];

				// Configures all business units names as selectable options
				const businessUnitOptions: InputOptionsSettings[] = businessUnitsList.map((businessUnit: string) => ({
					id: businessUnit.toLowerCase(),
					label: businessUnit,
					detail: ""
				}));

				// Requests user to select all or one Business Unit
				const selectedBU: InputOptionsSettings | InputOptionsSettings[] | undefined =
					await editorInput.handleQuickPickSelection(
						[allPlaceholderOption, ...businessUnitOptions],
						mainConfig.messages.selectBusinessUnit,
						false
					);

				if (selectedBU && !Array.isArray(selectedBU)) {
					log("debug", `User selected '${selectedBU.label}' business unit.`);

					// Modify the credential status bar icon to contain the
					// selected Credential + selected Business Unit
					// devtoolsContainers.modifyStatusBar(
					//     "credentialbu",
					//     DevToolsCommands.commandPrefix,
					//     `${selectedCredential.label}/${selectedBU.label}`
					// );
				}
			}
		}
	} else {
		log("error", "[main_changeCredentialsBU] Error: CredentialBU List is undefined.");
	}
}

async function handleDevToolsSBCommand(): Promise<void> {
	log("debug", "Selecting SB SFMC DevTools command...");
	const devToolsCommandTypes: { id: string; title: string }[] = DevToolsCommands.getAllCommandTypes();

	if (devToolsCommandTypes) {
		// Configures all commandTypes names as selectable options
		const commandTypesOptions: InputOptionsSettings[] = devToolsCommandTypes.map(
			({ id, title }: { id: string; title: string }) => ({
				id: id.toLowerCase(),
				label: title,
				detail: ""
			})
		);

		// Requests user to select one DevTools Command Type
		const selectedCommandType: InputOptionsSettings | InputOptionsSettings[] | undefined =
			await editorInput.handleQuickPickSelection(
				commandTypesOptions,
				mainConfig.messages.selectCommandType,
				false
			);

		if (selectedCommandType && !Array.isArray(selectedCommandType)) {
			log("debug", `User selected in ${selectedCommandType.label} DevTools Command type.`);
			const commands: DevToolsCommandSetting[] = DevToolsCommands.getCommandsListByType(selectedCommandType.id);

			// Configures all devtools commands as selectable options
			const commandsOptions: InputOptionsSettings[] = commands.map((command: DevToolsCommandSetting) => ({
				id: command.id.toLowerCase(),
				label: command.title,
				detail: command.description
			}));
			// Requests user to select one DevTools Command Type
			const selectedCommandOption: InputOptionsSettings | InputOptionsSettings[] | undefined =
				await editorInput.handleQuickPickSelection(commandsOptions, mainConfig.messages.selectCommand, false);

			if (selectedCommandOption && !Array.isArray(selectedCommandOption)) {
				log("debug", `User selected in ${selectedCommandOption.label} DevTools Command.`);
				if (devtoolsContainers.isCredentialBUSelected()) {
					log("info", "Credential/BU is selected...");
					const selectedCredentialBU: string | undefined = devtoolsContainers.getCredentialsBUName(
						DevToolsCommands.commandPrefix
					);
					if (selectedCredentialBU) {
						// execute DevTools Command
						DevToolsCommands.runCommand(
							selectedCommandType.id,
							selectedCommandOption.id,
							editorWorkspace.getWorkspaceURIPath(),
							{
								bu: selectedCredentialBU.replace(mainConfig.allPlaceholder, "'*'")
							},
							{ handleCommandResult: (result: any) => log("info", result) }
						);
					} else {
						log("error", `[main_handleDevToolsCommandSelection] Error: Failed to retrieve Credential/BU.`);
					}
				} else {
					if (DevToolsCommands.requiresCredentials(selectedCommandType.id)) {
						log(
							"debug",
							`Crendentials are required to be selected first for type '${selectedCommandType.id}'`
						);
						editorInput.handleShowNotificationMessage(
							"warning",
							`${
								mainConfig.messages.selectedCredentialsBU
							} '${lib.capitalizeFirstLetter(selectedCommandOption.id)}'...`,
							[]
						);
						lib.waitTime(1000, () => changeCredentialsBU());
					} else {
						// execute DevTools Command
						DevToolsCommands.runCommand(
							selectedCommandType.id,
							selectedCommandOption.id,
							editorWorkspace.getWorkspaceURIPath(),
							{},
							{ handleCommandResult: (result: any) => log("info", result) }
						);
					}
				}
			}
		}
	}
}

async function initialize(): Promise<void> {
	await handleDevToolsRequirements();

	const userResponse: string | undefined = await editorInput.handleShowOptionsMessage(
		mainConfig.messages.initDevTools,
		Object.keys(InstallDevToolsResponseOptions).filter(v => isNaN(Number(v)))
	);

	if (userResponse && InstallDevToolsResponseOptions[userResponse as keyof typeof InstallDevToolsResponseOptions]) {
		log("info", "Initializing SFMC DevTools project...");
		DevToolsCommands.runCommand(
			null,
			"init",
			editorWorkspace.getWorkspaceURIPath(),
			{},
			{
				handleCommandResult: () => {
					log("info", "Reloading VSCode workspace window...");
					lib.waitTime(5000, () => editorWorkspace.reloadWorkspace());
				}
			}
		);
	}
}

function handleMCDevSBCommand() {
	editorOutput.showOuputChannel();
}

function getMCDevRelativePathComponents(relativePath: string): DevToolsPathComponents {
	const [credentialName, businessUnit, metadataType, ...keys]: string[] = relativePath.split("/");
	return { credentialName, businessUnit, metadataType, keys };
}

function logUnsupportedMtdtTypeNotification(action: string, unsupportedMtdtTypes: string | string[]) {
	[unsupportedMtdtTypes].flat().forEach((metadataType: string) => {
		log(
			"error",
			`Error: SFMC DevTools currently does not support ${action} for the metadata type: '${metadataType}'`
		);
	});
	devtoolsContainers.modifyStatusBar("mcdev", "error");
	editorInput.handleShowNotificationMessage("error", mainConfig.messages.unsupportedMetadataType, []);
}

async function handleDevToolsCMCommand(action: string, selectedPaths: string[]): Promise<void> {
	log("debug", "Selecting CM SFMC DevTools command...");
	try {
		type ArgsConfig = {
			bu: string;
			mdtypes: string | string[];
			key: string | string[];
			fromRetrieve: boolean;
		};
		type ProjectConfig = { path: string; args: ArgsConfig[] };
		let filesType: string[] = [],
			folderType: string[] = [];

		// Separates files and folders into different arrays
		for (const path of selectedPaths) {
			(await editorWorkspace.isFile(path)) ? filesType.push(path) : folderType.push(path);
		}

		// Removes duplicate files (eg. some files have the same name with md and json)
		if (filesType.length) {
			filesType = lib.removeDuplicates(
				lib.removeExtensionFromFile(filesType, mainConfig.fileExtensions)
			) as string[];
		}

		const configureArgsProject = async (
			action: string,
			selectedPaths: string[]
		): Promise<{ [key: string]: ProjectConfig }> => {
			const projectArgsMap: { [key: string]: ProjectConfig } = {};

			// gets workspace directory
			const workspaceFolderPath: string = editorWorkspace.getWorkspaceURIPath();

			for (const filePath of selectedPaths) {
				let projectName: string = "";
				let [projectPath, cmPath]: string[] = [];
				let args: ArgsConfig[] = [];
				let fromRetrieve: boolean = false;

				if (filePath.includes(action)) {
					// Action Retrieve or Deploy were triggered from their folder
					[projectPath, cmPath] = filePath.split(`/${action}`);
				} else {
					if (action === "deploy") {
						log("debug", "Context Menu Command Deploy From Retrieve folder...");
						// Action Deploy from Retrieve was triggered (fromRetrieve)
						[projectPath, cmPath] = filePath.split(`/retrieve`);
						fromRetrieve = true;
					} else {
						// error
					}
				}

				// Gets the project folder name
				projectName = lib.getProjectNameFromPath(projectPath);

				log("debug", `Current workspace folder path: ${workspaceFolderPath}`);
				log("debug", `Project Name: ${projectName}`);
				log("debug", `Project path: ${projectPath}`);
				log("debug", `Context Menu path: ${cmPath}`);

				log("debug", `Project ${workspaceFolderPath === projectPath ? "is" : "is not"} the workspace folder.`);

				// Check if context menu being triggered is from outside of the workspace folder
				if (workspaceFolderPath !== projectPath) {
					// Check if folder is a DevTools project
					const isSubFolderDevToolsProject: boolean = await isADevToolsProject(projectName + "/");
					log(
						"debug",
						`SubFolder project '${projectPath}' ${
							isSubFolderDevToolsProject ? "is" : "is not"
						} a DevTools Project.`
					);
					if (!isSubFolderDevToolsProject) {
						editorInput.handleShowNotificationMessage(
							"error",
							`Folder '${projectName}' is not a SFMC DevTools Project.`,
							[]
						);
						return {};
					}
				}

				// Checks if the project name is already in the map
				if (!(projectName in projectArgsMap)) {
					projectArgsMap[projectName] = {
						path: projectPath,
						args: []
					};
				}

				args = projectArgsMap[projectName].args;

				// When user only clicks on retrieve or deploy folder
				if (projectPath && !cmPath) {
					let filteredByBU: ArgsConfig[] = args.filter(
						({ bu }: ArgsConfig) => bu !== undefined && bu === `"*"`
					);
					if (!filteredByBU.length) {
						args = [...args, { bu: `"*"`, mdtypes: [], key: [], fromRetrieve }];
					}
					log("debug", `Updated project path for '${action} "*"': ${projectPath}.`);
				}

				// When user clicks inside a retrieve or deploy folder
				if (cmPath) {
					let { credentialName, businessUnit, metadataType, keys } = getMCDevRelativePathComponents(
						cmPath.substring(1)
					);
					let key: string = "";

					if (metadataType && !DevToolsCommands.isSupportedMetadataType(action, metadataType)) {
						logUnsupportedMtdtTypeNotification(action, metadataType);
						continue;
					}

					// If user selected to retrieve/deploy a subfolder/file inside metadata type asset folder
					if (metadataType === "asset" && keys.length) {
						// Gets the asset subfolder and asset key
						const [assetFolder, assetKey] = keys;
						if (!assetKey) {
							// if user only selected an asset subfolder
							// type will be changed to "asset-[name of the asset subfolder]"
							metadataType = `${metadataType}-${assetFolder}`;
						}
						// if user selects a file inside a subfolder of asset
						// the key will be the name of the file
						keys = assetKey ? [assetKey] : [];
					} else if (metadataType === "folder" && keys.length) {
						// Nested folders are not supported as keys for the metadata type folder
						keys = [];
					}

					key = keys.length ? keys[0] : "";

					let filteredByBU: ArgsConfig[] = args.filter(
						({ bu }: ArgsConfig) =>
							bu !== undefined && bu === `${credentialName}/${businessUnit ? businessUnit : "*"}`
					);

					if (filteredByBU.length) {
						let newArgs: ArgsConfig = {
							bu: filteredByBU[0].bu,
							mdtypes: lib.removeNonValues(
								lib.removeDuplicates([...filteredByBU[0]["mdtypes"], metadataType]) as string[]
							) as string[],
							key: lib.removeNonValues(
								lib.removeDuplicates([...filteredByBU[0]["key"], key]) as string[]
							) as string[],
							fromRetrieve: filteredByBU[0].fromRetrieve
						};
						args = [
							...args.filter(
								({ bu }: ArgsConfig) => bu !== `${credentialName}/${businessUnit ? businessUnit : "*"}`
							),
							newArgs
						];
					} else {
						args = [
							...args,
							{
								bu: `${credentialName}/${businessUnit ? businessUnit : "*"}`,
								mdtypes: lib.removeNonValues([metadataType]) as string[],
								key: lib.removeNonValues([key]) as string[],
								fromRetrieve
							}
						];
					}
				}
				projectArgsMap[projectName].args = args;
			}
			return projectArgsMap;
		};

		for (const optionType of [filesType, folderType]) {
			if (optionType.length) {
				const projectMap: { [key: string]: ProjectConfig } = await configureArgsProject(action, optionType);
				await Promise.all(
					Object.keys(projectMap).map(async (projName: string) => {
						log("debug", `Running DevTools Command for project ${projName}`);
						let { path, args }: ProjectConfig = projectMap[projName];
						args = args.map((arg: ArgsConfig) => ({
							...arg,
							mdtypes: arg.mdtypes.length ? `"${(arg.mdtypes as string[]).join(",")}"` : "",
							key: arg.key.length ? `"${(arg.key as string[]).join(",")}"` : ""
						}));

						for (const dtArgs of args) {
							log("debug", `Action: ${action} Args: ${JSON.stringify(dtArgs)}`);
							devtoolsContainers.modifyStatusBar(
								"mcdev",
								action.toLowerCase() as keyof typeof StatusBarIcon
							);
							await editorInput.handleInProgressMessage("Notification", progress => {
								return new Promise<void>(resolve =>
									DevToolsCommands.runCommand(null, action, path, dtArgs, {
										loadingNotification: () =>
											progress.report({
												message: mainConfig.messages.runningCommand
											}),
										handleCommandResult: ({
											success,
											cancelled
										}: {
											success: boolean;
											cancelled: boolean;
										}) => {
											if (!cancelled) {
												editorInput.handleShowNotificationMessage(
													success ? "info" : "error",
													success
														? mainConfig.messages.successRunningCommand
														: mainConfig.messages.failureRunningCommand,
													[]
												);
												devtoolsContainers.modifyStatusBar(
													"mcdev",
													success ? "success" : "error"
												);
												resolve();
											}
										}
									})
								);
							});
						}
					})
				);
			}
		}
	} catch (error) {
		log("error", `[main_handleDevToolsCMCommand] Error: ${error}`);
	}
}

async function handleCopyToBuCMCommand(selectedPaths: string[]) {
	try {
		enum CopyToBUInputOptions {
			COPY = `$(${StatusBarIcon.copy_to_folder})  Copy`,
			COPY_AND_DEPLOY = `$(${StatusBarIcon.deploy})  Copy & Deploy`
		}

		type DevToolsPathConfiguration = DevToolsPathComponents & {
			absolutePath: string;
		};
		type SupportedMetadataTypeConfiguration = {
			supportedMetadataTypes: DevToolsPathConfiguration[];
			unsupportedMetadataTypes: string[];
		};

		const actionOptionList: InputOptionsSettings[] = Object.values(CopyToBUInputOptions).map((action: string) => ({
			id: action,
			label: action,
			detail: ""
		}));

		const configuredSelectedPaths: DevToolsPathConfiguration[] = selectedPaths.map((path: string) => {
			const [_, relativeDevToolsPath]: string[] = path.split(/\/retrieve\/|\/deploy\//);
			return {
				...getMCDevRelativePathComponents(relativeDevToolsPath),
				absolutePath: path
			};
		});

		const { supportedMetadataTypes, unsupportedMetadataTypes }: SupportedMetadataTypeConfiguration =
			configuredSelectedPaths.reduce(
				(accObj: SupportedMetadataTypeConfiguration, configPath: DevToolsPathConfiguration) => {
					if (DevToolsCommands.isSupportedMetadataType("deploy", configPath.metadataType)) {
						accObj.supportedMetadataTypes.push(configPath);
					} else {
						accObj.unsupportedMetadataTypes = lib.removeDuplicates([
							...accObj.unsupportedMetadataTypes,
							configPath.metadataType
						]) as string[];
					}
					return accObj;
				},
				{ supportedMetadataTypes: [], unsupportedMetadataTypes: [] }
			);

		if (unsupportedMetadataTypes.length && !supportedMetadataTypes.length) {
			logUnsupportedMtdtTypeNotification("deploy", unsupportedMetadataTypes);
			return;
		}

		const selectedAction: InputOptionsSettings | undefined = (await editorInput.handleQuickPickSelection(
			actionOptionList,
			mainConfig.messages.copyToBUInput,
			false
		)) as InputOptionsSettings;

		if (selectedAction) {
			const credentials: { [key: string]: string[] } | undefined = await getCredentialsBU();
			if (credentials) {
				const instances: string[] = Object.keys(credentials);
				const singleInstance: boolean = instances.length === 1;
				let selectedInstance: string = singleInstance ? instances[0] : "";

				if (!singleInstance) {
					const instanceOptions: InputOptionsSettings[] = instances.map((instance: string) => ({
						id: instance,
						label: instance,
						detail: ""
					}));
					const instanceResponse: InputOptionsSettings | undefined =
						(await editorInput.handleQuickPickSelection(
							instanceOptions,
							mainConfig.messages.selectCredential,
							false
						)) as InputOptionsSettings;
					if (instanceResponse) {
						selectedInstance = instanceResponse.id;
					}
				}

				if (selectedInstance) {
					const buOptionsList: InputOptionsSettings[] = credentials[selectedInstance].map(
						(businessUnit: string) => ({
							id: businessUnit,
							label: businessUnit,
							detail: ""
						})
					);
					const buOptions: InputOptionsSettings[] | undefined = (await editorInput.handleQuickPickSelection(
						buOptionsList,
						mainConfig.messages.selectBusinessUnit,
						true
					)) as InputOptionsSettings[];

					if (buOptions) {
						type FileCopyConfig = {
							sourceFilePath: string;
							targetFilePath: string;
						};
						const buSelected: string[] = buOptions.map((bu: InputOptionsSettings) => bu.id);

						const filePathsConfigured: FileCopyConfig[] = supportedMetadataTypes
							.map((configPath: DevToolsPathConfiguration) => {
								const { absolutePath, businessUnit } = configPath;

								if (businessUnit) {
									let paths: string[] = [];

									if (file.isPathADirectory(absolutePath)) {
										paths = [...paths, absolutePath];
									} else {
										const [currentFileExt]: string[] = mainConfig.fileExtensions.filter(
											(fileExt: string) => absolutePath.endsWith(fileExt)
										);
										if (currentFileExt) {
											paths = [
												...paths,
												...file.fileExists(
													mainConfig.fileExtensions
														.filter(
															(fileExtension: string) =>
																!mainConfig.noCopyFileExtensions.includes(fileExtension)
														)
														.map((fileExtension: string) =>
															absolutePath.replace(currentFileExt, fileExtension)
														)
												)
											];
										}
									}

									return buSelected
										.filter((buSelected: string) => buSelected !== businessUnit)
										.map((buSelected: string) =>
											paths.map((keyFilePath: string) => ({
												sourceFilePath: keyFilePath,
												targetFilePath: keyFilePath
													.replace(/\/retrieve\//, "/deploy/")
													.replace(businessUnit, buSelected)
											}))
										)
										.flat();
								}
								return;
							})
							.filter((filePath: FileCopyConfig[] | undefined) => filePath !== undefined)
							.flat() as FileCopyConfig[];

						const targetFilePaths: string[] = await file.copyFile(
							filePathsConfigured as FileCopyConfig[],
							(error: any) => {
								if (error !== null) {
									log("error", `[main_handleCopyToBuCMCommand] Failed to copy file: ${error}`);
								}
							}
						);

						if (selectedAction.label === CopyToBUInputOptions.COPY_AND_DEPLOY) {
							handleDevToolsCMCommand("deploy", targetFilePaths);
						}

						if (unsupportedMetadataTypes.length) {
							logUnsupportedMtdtTypeNotification("deploy", unsupportedMetadataTypes);
						}

						log(
							"info",
							`Copying to the deploy folder` +
								`${
									selectedAction.label === CopyToBUInputOptions.COPY_AND_DEPLOY
										? " and Deploying "
										: " "
								}` +
								`the following selected files:\n` +
								editorWorkspace.getFileSystemPaths(targetFilePaths).join("\n")
						);
					}
				}
			} else {
				log("error", `[main_handleCopyToBuCMCommand] Failed to retrieve DevTools credentials.`);
			}
		}
	} catch (error) {
		log("error", `[main_handleCopyToBuCMCommand] Error: ${error}`);
	}
}

export const devtoolsMain = {
	initDevToolsExtension,
	handleStatusBarActions,
	handleContextMenuActions
};
