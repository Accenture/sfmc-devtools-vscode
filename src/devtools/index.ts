import Mcdev from "./mcdev";
import ContentBlockLinkProvider, { ASSET_CACHE_GLOB } from "../editor/contentBlockLinkProvider";
import RelatedItemLinkProvider from "../editor/relatedItemLinkProvider";
import RelatedItemDiagnosticProvider from "../editor/relatedItemDiagnosticProvider";
import RelatedItemCodeActionProvider, {
	RETRIEVE_RELATED_ITEM_COMMAND,
	type IRetrieveRelatedItemArgs
} from "../editor/relatedItemCodeActionProvider";
import DataExtensionLinkProvider from "../editor/dataExtensionLinkProvider";
import { ConfigExtension } from "@config";
import { MessagesDevTools, MessagesEditor } from "@messages";
import { EnumsDevTools, EnumsExtension } from "@enums";
import { TDevTools, TEditor, TUtils, VSCode } from "@types";
import { Lib, File, VsceLogger } from "utils";

/**
 * DevTools Extension class
 *
 * @class DevToolsExtension
 * @typedef {DevToolsExtension}
 */
class DevToolsExtension {
	/**
	 * Vscode Editor class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeEditor}
	 */
	private vscodeEditor: TEditor.VSCodeEditor;
	/**
	 * Mcdev class instance
	 *
	 * @private
	 * @type {Mcdev}
	 */
	private mcdev: Mcdev;

	/**
	 * Creates an instance of DevToolsExtension.
	 *
	 * @constructor
	 * @param {TEditor.IExtensionContext} context - extension context
	 */
	constructor(context: TEditor.IExtensionContext) {
		this.vscodeEditor = new TEditor.VSCodeEditor(context);
		this.mcdev = new Mcdev();
	}

	/**
	 * Initializes the extension
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async init(): Promise<void> {
		console.log("== Init ==");
		// Checks if is there any DevTools Project
		const isDevToolsProject = await this.isDevToolsProject();
		if (isDevToolsProject) this.loadConfiguration();
	}

	/**
	 * Checks if the current VSCode workspace has DevTools projects
	 *
	 * @async
	 * @returns {Promise<boolean>} true if there is a DevTools project else false
	 */
	async isDevToolsProject(): Promise<boolean> {
		console.log("== Is Project ==");
		const requiredProjectFiles = this.mcdev.getRequiredFiles() || [];
		// Checks if the required DevTools files exist in the folder/folders
		const filesInFolderResult = await Promise.all(
			requiredProjectFiles.map(
				async file => await this.vscodeEditor.getWorkspace().isFileInWorkspaceFolder(`**/${file}`)
			)
		);
		return filesInFolderResult.every(fileResult => fileResult);
	}

	/**
	 * Initiates the extension configuration methods
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async loadConfiguration(): Promise<void> {
		console.log("== Load Configuration ==");
		try {
			// Check if Mcdev is installed
			const mcdevInstalled = this.mcdev.isInstalled();
			// request user to install mcdev
			if (!mcdevInstalled) await this.mcdevInstall();
			else {
				// activate extension context variables
				this.activateContextVariables();
				// activate recommended extensions
				this.activateRecommendedExtensions();
				// activate editor containers
				this.activateContainers();
				// activate menu commands
				this.activateMenuCommands();
				// activate document link providers
				this.activateLinkProviders();
				// logs initial extension information into output channel
				this.writeExtensionInformation();
				// refresh metadata types in background from mcdev
				this.refreshMetadataTypesInBackground();
			}
		} catch (error) {
			// log as debug error
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Installs DevTools package 'mcdev'
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async mcdevInstall(): Promise<void> {
		console.log("== Install Mcdev ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		// Asks user if he wishes to install mcdev
		const userAnswer = await this.showInformationMessage(
			"info",
			MessagesDevTools.noMcdevInstalled,
			Object.keys(EnumsExtension.Confirmation)
		);

		const handleInstallResult = async (success: boolean, error: string): Promise<void> => {
			// if mcdev was successfully installed -> reloads vscode editor window
			// else shows information error message
			if (success) {
				const reload = await this.showInformationMessage("info", MessagesDevTools.mcdevInstallSuccess, [
					"Reload Window"
				]);
				if (reload) vscodeCommands.reloadWorkspace();
			} else {
				this.showInformationMessage("error", MessagesDevTools.mcdevInstallError, []);
				if (error) this.writeLog(this.mcdev.getPackageName(), error, EnumsExtension.LoggerLevel.ERROR);
			}
		};

		if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.Confirmation.Yes) {
			// Shows loading notification
			this.activateNotificationProgressBar(
				MessagesDevTools.mcdevInstallLoading,
				false,
				() =>
					new Promise(resolve => {
						// Installs DevTools package 'mcdev'
						const { success, error }: { success: boolean; error: string } = this.mcdev.install();
						handleInstallResult(success, error);
						resolve(success);
					})
			);
		}
	}

	/**
	 * Activates the extension context variables
	 *
	 * @returns {void}
	 */
	activateContextVariables(): void {
		console.log("== Activate Context Variables ==");
		const vscodeCommands = this.vscodeEditor.getCommands();
		// Sets vscode environment variable 'isproject' to true
		vscodeCommands.executeCommandContext(`${ConfigExtension.extensionName}.config.isproject`, [true]);
	}

	/**
	 * Activates the extension recommended extensions
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async activateRecommendedExtensions(): Promise<void> {
		console.log("== Activate Recommended Extensions ==");
		const vscodeWorkspace = this.vscodeEditor.getWorkspace();
		const vscodeExtensions = this.vscodeEditor.getExtensions();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const recommendedExtensions = ConfigExtension.recommendedExtensions;
		const configurationKey = "recommendExtensions";

		// Checks if recommended extensions are already installed
		const uninstalledExtensions = recommendedExtensions.filter(
			extension => !vscodeExtensions.isExtensionInstalled(extension)
		);

		// Checks if recommended extensions suggestion is enabled
		const recommendExtensions = vscodeWorkspace.isConfigurationKeyEnabled(
			ConfigExtension.extensionName,
			configurationKey
		);

		if (uninstalledExtensions.length && recommendExtensions) {
			// Asks the user if he wants to install recommended extensions
			const userAnswer = await this.showInformationMessage(
				"info",
				MessagesEditor.recommendedExtensions,
				Object.keys(EnumsExtension.RecommendedExtensionsOptions)
			);

			// if user clicks on "do not show again" then recommendExtension disabled
			if (
				userAnswer &&
				userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions["Do not show again"]
			)
				vscodeWorkspace.setConfigurationKey(ConfigExtension.extensionName, configurationKey, false);
			// if user clicks on "install" then installs extensions
			if (userAnswer && userAnswer.toLowerCase() === EnumsExtension.RecommendedExtensionsOptions.Install)
				vscodeCommands.installExtension(uninstalledExtensions);
		}
	}

	/**
	 * Activates the extension containers
	 *
	 * @returns {void}
	 */
	activateContainers(): void {
		console.log("== Activate Containers ==");
		const vscodeWindow = this.vscodeEditor.getWindow();
		const vscodeCommands = this.vscodeEditor.getCommands();
		const packageName = this.mcdev.getPackageName();

		// Sets the command when the status bar is clicked
		const statusBarCommand = `${ConfigExtension.extensionName}.openOutputChannel`;
		// Sets the default status bar icon and name
		const statusBarTitle = `$(${EnumsExtension.StatusBarIcon.success}) ${this.mcdev.getPackageName()}`;

		// Registers the status bar command to display the Ouput Channel when clicked
		vscodeCommands.registerCommand({
			command: statusBarCommand,
			callbackAction: () => vscodeWindow.displayOutputChannel(packageName)
		});

		// Creates and displays the Status Bar Item
		vscodeWindow.createStatusBarItem(statusBarCommand, statusBarTitle, packageName);
		vscodeWindow.displayStatusBarItem(packageName);
	}

	/**
	 * Writes initial extension information to the output channel
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async writeExtensionInformation(): Promise<void> {
		const context = this.vscodeEditor.getContext();
		const workspace = this.vscodeEditor.getWorkspace();
		const packageName = this.mcdev.getPackageName();

		// Gets the .mcdevrc file name from the required DevTools file list
		const configFileName = this.mcdev.getConfigFileName();
		// For every devtools project folder in the open workspace it retrieves the complete path of the .mcdevrc file
		const configFsPath = await workspace.findWorkspaceFiles(`**/${configFileName}`);
		// Builds the message to be displayed with the .mcdevrc file path
		const configFilePathMessage = configFsPath.map(path => `${MessagesDevTools.mcdevConfigFile} ${path}`);

		const messages = [
			`Extension name: ${context.getExtensionName()}`,
			`Extension version: ${context.getExtensionVersion()}`,
			...configFilePathMessage
		];
		// Prints the messages to the Output channel
		messages.forEach(message => this.writeLog(packageName, message, EnumsExtension.LoggerLevel.INFO));
	}

	/**
	 * Runs 'mcdev explainTypes --json' in the background after initial load and updates
	 * the metadata types list if new or removed types are detected.
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async refreshMetadataTypesInBackground(): Promise<void> {
		try {
			const workspace = this.vscodeEditor.getWorkspace();
			const workspacePath = workspace.getWorkspaceFsPath();
			const packageName = this.mcdev.getPackageName();

			const types = await this.mcdev.runExplainTypes(workspacePath);
			if (!types) return;

			const updated = this.mcdev.updateMetadataTypes(types);
			if (updated) {
				this.writeLog(
					packageName,
					`Metadata types updated from '${packageName} explainTypes --json' (${types.length} types loaded)`,
					EnumsExtension.LoggerLevel.INFO
				);
			}
		} catch (error) {
			this.writeLog(
				this.mcdev.getPackageName(),
				`[index_refreshMetadataTypesInBackground]: ${error}`,
				EnumsExtension.LoggerLevel.WARN
			);
		}
	}

	/**
	 * Updates extension containers
	 *
	 * @param {string} containerName - name of the container
	 * @param {{ [key in TEditor.StatusBarFields]?: string }} fields - fields and values to update
	 * @returns {void}
	 */
	updateContainers(containerName: string, fields: { [key in TEditor.StatusBarFields]?: string }): void {
		const vscodeWindow = this.vscodeEditor.getWindow();
		// Updates the status bar container
		vscodeWindow.updateStatusBarItem(containerName, fields);
	}

	/**
	 * Shows a VScode Information message
	 *
	 * @async
	 * @param {("info" | "error")} type - modal message type
	 * @param {string} title - modal message
	 * @param {string[]} options - options in the modal
	 * @returns {Promise<string | undefined>} returs the option the user clicked or undefined if no option was selected
	 */
	async showInformationMessage(
		type: "info" | "error",
		title: string,
		options: string[],
		isModal?: boolean
	): Promise<string | undefined> {
		const vscodeWindow = this.vscodeEditor.getWindow();
		// Shows the modal message with the title and options
		const answer =
			type === "info"
				? await vscodeWindow.showInformationMessageWithOptions(title, options, isModal || false)
				: await vscodeWindow.showErrorMessageWithOptions(title, options);
		return answer;
	}

	/**
	 * Writes logs to output channel according to Logger Level
	 *
	 * @param {string} ouputChannel - ouput channel name
	 * @param {string} message - message to be displayed
	 * @param {EnumsExtension.LoggerLevel} level - logger level
	 * @param {VsceLogger} [sessionLogger] - optional session-scoped logger for file output
	 * @returns {void}
	 */
	writeLog(
		ouputChannel: string,
		message: string,
		level: EnumsExtension.LoggerLevel,
		sessionLogger?: VsceLogger
	): void {
		const timestamp = Lib.getCurrentTime();
		const nonOutputLevel = [EnumsExtension.LoggerLevel.DEBUG, EnumsExtension.LoggerLevel.ERROR];
		// every logger level except output should be in format 'timestamp level: message'
		message = level !== EnumsExtension.LoggerLevel.OUTPUT ? `${timestamp} ${level}: ${message}` : message;

		if (!nonOutputLevel.includes(level)) this.logTextOutputChannel(ouputChannel, message);
		// write DEBUG/INFO/WARN/ERROR entries to the VSCE log file; skip OUTPUT (mcdev output)
		if (level !== EnumsExtension.LoggerLevel.OUTPUT && sessionLogger) {
			const isError = level === EnumsExtension.LoggerLevel.ERROR || level === EnumsExtension.LoggerLevel.WARN;
			sessionLogger.write(message, isError);
		}
		console.log(message);
	}

	/**
	 * Logs text to a specific Ouput Channel
	 *
	 * @param {string} name - name of the ouput channel
	 * @param {string} text - text to be displayed in the output channel
	 * @returns {void}
	 */
	logTextOutputChannel(name: string, text: string): void {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			vscodeWindow.appendTextToOutputChannel(name, text);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Shows a specific output channel by name
	 *
	 * @param {string} name - name of the channel
	 * @returns {void}
	 */
	showOuputChannel(name: string): void {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			vscodeWindow.displayOutputChannel(name);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Prompts the user with a selection of options and returns their choice.
	 *
	 * @param options - An array of strings representing the options to present to the user.
	 * @param title - The title of the prompt window.
	 * @param multipleOptions - A boolean indicating whether multiple options can be selected.
	 * @returns A promise that resolves to the user's selection. If `multipleOptions` is true,
	 *          it returns an array of selected options. If `multipleOptions` is false, it
	 *          returns a single selected option. If the user cancels the prompt, it returns `undefined`.
	 */
	async requestInputWithOptions(
		options: string[],
		title: string,
		multipleOptions: boolean
	): Promise<string | string[] | undefined> {
		const window = this.vscodeEditor.getWindow();
		const userAnswer = await window.showQuickPickOptions(options, title, multipleOptions);
		// Returns the user's selection or undefined if the user cancels the prompt
		if (!userAnswer) return;
		// Returns the selected options as an array if multiple options can be selected
		if (Array.isArray(userAnswer)) return userAnswer.map(answer => answer.label);
		// Returns the selected option as a string if only one option can be selected
		return userAnswer.label;
	}

	/**
	 * Prompts the user to enter free-form text and returns their input.
	 *
	 * @param {string} prompt - The message shown below the input field.
	 * @param {string} [placeHolder] - Optional placeholder text shown inside the input field.
	 * @returns {Promise<string | undefined>} The value entered by the user, or undefined if cancelled.
	 */
	async requestInputText(prompt: string, placeHolder?: string): Promise<string | undefined> {
		const window = this.vscodeEditor.getWindow();
		return window.showInputBox(prompt, placeHolder);
	}

	/**
	 * Opens a file in the editor given its path.
	 *
	 * @param path - The path of the file to open.
	 * @returns A promise that resolves when the file is opened in the editor.
	 *
	 * @throws Will log an error if the file cannot be opened.
	 */
	async openFileInEditor(path: string): Promise<void> {
		try {
			const workspace = this.vscodeEditor.getWorkspace();
			const window = this.vscodeEditor.getWindow();

			// Opens the file in the editor
			const document = await workspace.openDocument(path);
			window.showDocument(document);
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
		}
	}

	/**
	 * Gets the current open tab file path
	 *
	 * @returns {(string | undefined)} - opened file path or undefined otherwise
	 */
	getActiveTabFilePath(): string | undefined {
		try {
			const vscodeWindow = this.vscodeEditor.getWindow();
			return vscodeWindow.getEditorOpenedFilePath();
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
			return;
		}
	}

	/**
	 * Displays the Vscode In Progress modal
	 *
	 * @param {string} title - message to be displayed in the modal
	 * @param {boolean} cancellable - options to define if the modal is cancellable
	 * @param {TEditor.ProgressBarHandler} progressBarHandler - handler function when showing the in progress modal
	 * @returns {void}
	 */
	activateNotificationProgressBar(
		title: string,
		cancellable: boolean,
		progressBarHandler: TEditor.ProgressBarHandler
	): void {
		const vscodeWindow = this.vscodeEditor.getWindow();
		vscodeWindow.showProgressBar(title, "Notification", cancellable, progressBarHandler);
	}

	/**
	 * Filters the given files to only those whose metadata type supports the specified action.
	 * For files where the type is not known (no metadataType field), the file is kept (permissive).
	 * When unsupported types are found, an error notification is shown and the error is logged.
	 *
	 * @param {TDevTools.IExecuteFileDetails[]} files - selected files to validate
	 * @param {string} action - action to validate (e.g. "delete", "deploy", "retrieve")
	 * @returns {TDevTools.IExecuteFileDetails[]} subset of files whose type supports the action
	 */
	filterSupportedFiles(files: TDevTools.IExecuteFileDetails[], action: string): TDevTools.IExecuteFileDetails[] {
		const unsupportedTypes: string[] = [];
		const supportedFiles = files.filter(file => {
			if (!file.metadataType) return true; // no type info at this path depth → pass through (permissive)
			const supported = this.mcdev.isActionSupportedForType(action, file.metadataType);
			if (!supported && !unsupportedTypes.includes(file.metadataType)) unsupportedTypes.push(file.metadataType);
			return supported;
		});
		if (unsupportedTypes.length) this.showActionNotSupportedError(action, unsupportedTypes);
		return supportedFiles;
	}

	/**
	 * Shows an error notification (without a loading bar) when a command is invoked for a
	 * metadata type that does not support the requested action.
	 * The error is logged to the extension's output channel and written to the VSCE log file.
	 * When ALL selected items are unsupported the error replaces the "running command" overlay
	 * (handlers return early before calling executeCommand). When only SOME items are unsupported
	 * the error notification appears alongside the running-command progress bar.
	 *
	 * @param {string} action - the action that is not supported
	 * @param {string[]} metadataTypes - list of metadata type api names that do not support the action
	 * @returns {void}
	 */
	showActionNotSupportedError(action: string, metadataTypes: string[]): void {
		const packageName = this.mcdev.getPackageName();
		const message = MessagesEditor.unsupportedAction(action, metadataTypes);

		// Create a dedicated log session so the error is persisted to the VSCE log file
		const sessionLogger = new VsceLogger();
		try {
			const workspacePath = this.vscodeEditor.getWorkspace().getWorkspaceFsPath();
			sessionLogger.startSession(workspacePath);
		} catch {
			// If workspace path is unavailable, skip file logging
		}
		// Logs to output channel (WARN appears there) and to the vsce-log file
		this.writeLog(packageName, message, EnumsExtension.LoggerLevel.WARN, sessionLogger);
		// Keep the log file since an error was logged
		sessionLogger.endSession(false);

		// Show error popup without a loading bar (fire-and-forget, same appearance as mcdev failure)
		this.showInformationMessage("error", message, []);
	}

	/**
	 * Registers the extension menu commands
	 *
	 * @returns {void}
	 */
	activateMenuCommands(): void {
		console.log("== Activate Menu Commands ==");
		const vscodeCommands = this.vscodeEditor.getCommands();

		ConfigExtension.menuCommands.forEach(command =>
			// For all the menu commands configured it will register the command and execution action
			vscodeCommands.registerCommand({
				command: `${ConfigExtension.extensionName}.${command}`,
				callbackAction: (files: string[]) => {
					const activeTabFilePath = this.getActiveTabFilePath();
					// When the menu command is done from the file tab it requires the active open file path
					if (!files.length && activeTabFilePath) files = [activeTabFilePath];
					if (files.length) this.executeMenuCommand(command, files);
				}
			})
		);

		// Register the palette-only "Restart extension" command that re-checks supported types
		vscodeCommands.registerCommand({
			command: `${ConfigExtension.extensionName}.restartExtension`,
			callbackAction: () => this.refreshMetadataTypesInBackground()
		});
	}

	/**
	 * Registers document link providers for the extension.
	 *
	 * 1. ContentBlockLinkProvider – enables Ctrl+Click navigation from
	 *    ContentBlockByKey() references to the corresponding asset file.
	 *    A key cache is pre-built by scanning retrieve/<cred>/<bu>/asset/{other,block}
	 *    files on startup (fire-and-forget) and kept live via a FileSystemWatcher.
	 *
	 * 2. RelatedItemLinkProvider – enables Ctrl+Click navigation from
	 *    r__TYPE_key values (and automation r__type / r__key pairs) in JSON
	 *    metadata files to the corresponding metadata file in the same BU tree.
	 *    Links are resolved on demand and cached after the first lookup.
	 *
	 * 3. DataExtensionLinkProvider – enables Ctrl+Click navigation from
	 *    dataExtension names referenced in FROM / JOIN clauses of SQL query
	 *    files (retrieve/<cred>/<bu>/query/*.sql) to the corresponding
	 *    dataExtension-meta.json file.  Names prefixed with "ENT." (case-
	 *    insensitive) are resolved against the parent BU folder instead.
	 *    A per-BU name cache is built lazily the first time a query file for
	 *    that BU is opened.
	 *
	 * 4. RelatedItemDiagnosticProvider – emits VS Code Error diagnostics (shown
	 *    inline, in the Problems panel, and as a red file indicator in the
	 *    Explorer) for every r__TYPE_key / r__type + r__key reference whose
	 *    target file cannot be found in the retrieve tree.
	 *
	 * 5. RelatedItemCodeActionProvider – provides a "Retrieve type:key from
	 *    cred/bu" quick fix for each unresolved-reference diagnostic.
	 *
	 * @returns {void}
	 */
	activateLinkProviders(): void {
		console.log("== Activate Link Providers ==");
		const vscodeContext = this.vscodeEditor.getContext();
		const vscodeWorkspace = this.vscodeEditor.getWorkspace();

		const provider = new ContentBlockLinkProvider();

		// Populate the key cache in the background; links resolve instantly once ready
		provider.init().catch(err => {
			console.error("[sfmc-devtools-vscode] ContentBlockLinkProvider cache init failed:", err);
		});

		// Keep the cache live as asset files are added or removed
		const workspaceUri = vscodeWorkspace.getWorkspaceURI();
		if (workspaceUri) {
			const watcher = VSCode.workspace.createFileSystemWatcher(
				new VSCode.RelativePattern(workspaceUri, ASSET_CACHE_GLOB)
			);
			watcher.onDidCreate(uri => provider.addToCache(uri));
			watcher.onDidDelete(uri => provider.removeFromCache(uri));
			vscodeContext.registerDisposable(watcher);
		}

		vscodeContext.registerDisposable(VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, provider));

		// Register on-demand link provider for r__TYPE_key relation fields in JSON files
		const relatedItemProvider = new RelatedItemLinkProvider();
		vscodeContext.registerDisposable(
			VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, relatedItemProvider)
		);

		// Register on-demand link provider for dataExtension names in SQL query files
		const dataExtensionProvider = new DataExtensionLinkProvider();
		vscodeContext.registerDisposable(
			VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, dataExtensionProvider)
		);

		// ── Diagnostic + quick-fix providers for unresolvable r__ references ──

		const diagnosticProvider = new RelatedItemDiagnosticProvider();
		vscodeContext.registerDisposable(diagnosticProvider.getDiagnosticCollection());

		// Validate already-open JSON documents on startup (fire-and-forget)
		VSCode.workspace.textDocuments.forEach(doc => {
			diagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider init validation failed:", err);
			});
		});

		// Validate whenever a JSON document is opened or saved
		vscodeContext.registerDisposable(
			VSCode.workspace.onDidOpenTextDocument(doc => {
				diagnosticProvider.validateDocument(doc).catch(err => {
					console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider open validation failed:", err);
				});
			})
		);
		vscodeContext.registerDisposable(
			VSCode.workspace.onDidSaveTextDocument(doc => {
				// Only clear the resolution cache when the saved file is inside the
				// retrieve tree – it may itself be a target that other documents reference.
				if (doc.uri.path.includes("/retrieve/")) diagnosticProvider.clearCache();
				diagnosticProvider.validateDocument(doc).catch(err => {
					console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider save validation failed:", err);
				});
			})
		);

		// Clear diagnostics when a document is closed
		vscodeContext.registerDisposable(
			VSCode.workspace.onDidCloseTextDocument(doc => {
				diagnosticProvider.clearDocument(doc.uri);
			})
		);

		// When retrieve files are added or deleted, clear the resolution cache
		// and re-validate all open JSON documents so diagnostics stay accurate.
		if (workspaceUri) {
			const retrieveWatcher = VSCode.workspace.createFileSystemWatcher(
				new VSCode.RelativePattern(workspaceUri, "retrieve/**/*.json")
			);
			const revalidateOpenDocs = () => {
				diagnosticProvider.clearCache();
				VSCode.workspace.textDocuments.forEach(doc => {
					diagnosticProvider.validateDocument(doc).catch(err => {
						console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider revalidation failed:", err);
					});
				});
			};
			retrieveWatcher.onDidCreate(revalidateOpenDocs);
			retrieveWatcher.onDidDelete(revalidateOpenDocs);
			vscodeContext.registerDisposable(retrieveWatcher);
		}

		// Register the quick-fix code-action provider for JSON files
		vscodeContext.registerDisposable(
			VSCode.languages.registerCodeActionsProvider(
				{ language: "json", scheme: "file" },
				new RelatedItemCodeActionProvider(),
				{ providedCodeActionKinds: [VSCode.CodeActionKind.QuickFix] }
			)
		);

		// Register the command executed by the quick fix
		vscodeContext.registerDisposable(
			VSCode.commands.registerCommand(
				RETRIEVE_RELATED_ITEM_COMMAND,
				({ projectPath, credBu, type, key }: IRetrieveRelatedItemArgs) => {
					const [credentialsName, businessUnit] = credBu.split("/");
					const fileDetail: TDevTools.IExecuteFileDetails = {
						level: "file",
						projectPath,
						topFolder: "/retrieve/",
						path: `${projectPath}/retrieve/${credBu}/${type}/${key}.${type}-meta.json`,
						credentialsName,
						businessUnit,
						metadataType: type,
						filename: key
					};
					this.executeCommand("retrieve", { filesDetails: [fileDetail] });
				}
			)
		);
	}

	/**
	 * Executes the Menu Command by command name
	 *
	 * @param {string} command - command name
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	executeMenuCommand(command: string, files: string[]): void {
		// Convert paths to file structure defined for DevTools Commands
		const selectedFiles = this.mcdev.convertPathsToFiles(files);

		// menu commands handlers
		const menuCommandsHandlers: { [key: string]: () => void } = {
			changekey: () => this.handleChangeKeyCommand(selectedFiles),
			copytobu: () => this.handleCopyToBUCommand(selectedFiles),
			delete: () => this.handleDeleteCommand(selectedFiles),
			deploy: () => this.handleDeployCommand(selectedFiles),
			retrieve: () => this.handleRetrieveCommand(selectedFiles)
		};

		const menuCommandHandler = menuCommandsHandlers[command];
		// Executes the menu command handler
		if (menuCommandHandler) menuCommandHandler();
		else
			this.writeLog(
				this.mcdev.getPackageName(),
				`[index_executeMenuCommand]: Invalid Menu Command: ${command}`,
				EnumsExtension.LoggerLevel.ERROR
			);
	}

	/**
	 * Handles the "Copy to BU" command by requesting user input for the action to perform,
	 * selecting the target business units, and executing the appropriate commands.
	 *
	 * @param files - An array of file details to be processed.
	 * @returns A promise that resolves when the command execution is complete.
	 * @throws Will log and handle any errors that occur during the execution.
	 */
	async handleCopyToBUCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		try {
			// Filter out metadata types that do not support deploy (clone requires deployability)
			const supportedFiles = this.filterSupportedFiles(files, "deploy");
			if (!supportedFiles.length) return;
			files = supportedFiles;

			// Request user to select the action to perform
			const userCopyToBUAnswer = (await this.requestInputWithOptions(
				Object.keys(EnumsDevTools.CopyToBUOptions),
				MessagesEditor.copyToBuPrompt,
				false
			)) as string | undefined;

			// If no action is selected, return
			if (!userCopyToBUAnswer) return;
			// Get the selected project paths without deplicates
			const selectedProjectPaths = Lib.removeDuplicates(files.map(file => file.projectPath)) as string[];

			// For each selected project path
			selectedProjectPaths.forEach(async selectedProjectPath => {
				// Filter the files by the selected project path
				const filesByProject = files.filter(file => file.projectPath === selectedProjectPath);

				// Select the business units for the selected project path
				const selectedBUs = (await this.selectBusinessUnits(selectedProjectPath, {
					multiBUs: false
				})) as string[];

				if (!selectedBUs.length) return;

				// Execute the 'clone' command with the selected files and business units
				await this.executeCommand("clone", {
					filesDetails: filesByProject,
					targetBusinessUnit: selectedBUs
				});

				// If the user selected the 'Copy And Deploy' option, deploy the copied files to the selected business units
				if (userCopyToBUAnswer.toLowerCase() === EnumsDevTools.CopyToBUOptions["Copy And Deploy"]) {
					const targetBUsFiles = selectedBUs.flatMap(selectedBU =>
						filesByProject.map(file =>
							file.path.replace(
								`/retrieve/${file.credentialsName}/${file.businessUnit}`,
								`/deploy/${selectedBU}`
							)
						)
					);
					// Execute the 'deploy' command with the selected files and target business units
					this.executeMenuCommand("deploy", targetBUsFiles);
				}
			});
		} catch (error) {
			// Show error message if no credentials are found in the mcdevrc file
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.ERROR);
			// Update the status bar with the error message
			this.updateStatusBar(
				this.mcdev.getPackageName(),
				this.getStatusBarTitle("error", this.mcdev.getPackageName()),
				"error"
			);
		}
	}

	/**
	 * Handles the Menu Command 'delete'
	 *
	 * @async
	 * @param {string[]} files - selected files paths
	 * @returns {Promise<void>}
	 */
	async handleDeleteCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		// Filter out metadata types that do not support delete
		const supportedFiles = this.filterSupportedFiles(files, "delete");
		if (!supportedFiles.length) return;
		// Get the file names and metadata types to display in the confirmation message
		const fileNamesList = supportedFiles.map(file => `${file.filename} (${file.metadataType})`);
		// Request user confirmation to delete the selected files
		const confirmationAnswer = await this.showInformationMessage(
			"info",
			MessagesEditor.deleteConfirmation(fileNamesList),
			Object.keys(EnumsExtension.Confirmation),
			true
		);
		// If the user cancels the confirmation, return
		if (!confirmationAnswer || confirmationAnswer.toLowerCase() !== EnumsExtension.Confirmation.Yes) return;
		// Execute the 'delete' command
		this.executeCommand("delete", { filesDetails: supportedFiles });
	}

	/**
	 * Handles the Menu Command 'deploy'
	 *
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	handleDeployCommand(files: TDevTools.IExecuteFileDetails[]): void {
		// Filter out metadata types that do not support deploy
		const supportedFiles = this.filterSupportedFiles(files, "deploy");
		if (!supportedFiles.length) return;
		this.executeCommand("deploy", { filesDetails: supportedFiles });
	}

	/**
	 * Reads a JSON file and returns its top-level attribute names.
	 * When the given path is not a .json file, the method looks for a sibling .json file
	 * with the same base name (e.g. myEmail.amp → myEmail.json) so that clicking on a
	 * related file still surfaces the correct field list.
	 * Returns an empty array when no readable JSON object can be found.
	 *
	 * @private
	 * @param {string} filePath - absolute path to the file
	 * @returns {string[]} sorted top-level keys, or [] on error
	 */
	private readJsonTopLevelKeys(filePath: string): string[] {
		try {
			let jsonPath = filePath;
			if (!filePath.endsWith(".json")) {
				// Derive the related .json path by replacing the last extension
				const lastDotIndex = filePath.lastIndexOf(".");
				const basePathWithoutExt = lastDotIndex > -1 ? filePath.substring(0, lastDotIndex) : filePath;
				const candidatePath = `${basePathWithoutExt}.json`;
				if (File.fileExists(candidatePath).length > 0) {
					jsonPath = candidatePath;
				} else if (filePath.endsWith("-doc.md")) {
					const candidatePath = `${filePath.split("-doc.md")[0]}-meta.json`;
					if (File.fileExists(candidatePath).length > 0) {
						jsonPath = candidatePath;
					}
				}
			}
			const content = File.readFileSync(Lib.removeLeadingRootDrivePath(jsonPath));
			const parsed = JSON.parse(content);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				return Object.keys(parsed).sort();
			}
		} catch {
			// File is not JSON or cannot be read; caller will fall back to free-text input
		}
		return [];
	}

	/**
	 * Handles the Menu Command 'changekey'.
	 * Prompts the user for the key-change method (field name or custom value) and
	 * runs `mcdev deploy ... --changeKeyField` or `--changeKeyValue` accordingly.
	 * Only works with files from the retrieve folder.
	 *
	 * @async
	 * @param {TDevTools.IExecuteFileDetails[]} files - selected files
	 * @returns {Promise<void>}
	 */
	async handleChangeKeyCommand(files: TDevTools.IExecuteFileDetails[]): Promise<void> {
		// Filter out metadata types that do not support changeKey
		const supportedFiles = this.filterSupportedFiles(files, "changekey");
		if (!supportedFiles.length) return;

		let changeKeyField: string | undefined;
		let changeKeyValue: string | undefined;

		if (supportedFiles.length > 1) {
			// Multiple files selected: all must share the same metadata type for "change key by field".
			const distinctTypes = [...new Set(supportedFiles.map(f => f.metadataType).filter(Boolean))] as string[];
			if (distinctTypes.length > 1) {
				this.showInformationMessage("error", MessagesEditor.changeKeyMixedTypesError(distinctTypes), []);
				return;
			}
			// All files share the same type: scan the first file and show the same
			// type-to-filter QuickPick as in single-file "Field" mode.
			const jsonKeys = this.readJsonTopLevelKeys(supportedFiles[0].path);
			if (jsonKeys.length) {
				changeKeyField = (await this.requestInputWithOptions(
					jsonKeys,
					MessagesEditor.changeKeyFieldListPrompt,
					false
				)) as string | undefined;
			} else {
				changeKeyField = await this.requestInputText(MessagesEditor.changeKeyFieldPrompt);
			}
			if (!changeKeyField) return;
		} else {
			// Single file selected: ask the user to choose between field or custom value
			const method = (await this.requestInputWithOptions(
				Object.keys(EnumsDevTools.ChangeKeyOptions),
				MessagesEditor.changeKeyMethodPrompt,
				false
			)) as string | undefined;
			if (!method) return;

			// QuickPick returns the option key as a label (e.g. "Field"); lowercasing it
			// matches the enum value (e.g. ChangeKeyOptions.Field = "field") – same pattern
			// as CopyToBUOptions comparisons in this file.
			if (method.toLowerCase() === EnumsDevTools.ChangeKeyOptions.Field) {
				// Try to populate the QuickPick from the file's JSON top-level keys so the
				// user can start typing to filter; fall back to free-text when unavailable.
				const jsonKeys = this.readJsonTopLevelKeys(supportedFiles[0].path);
				if (jsonKeys.length) {
					changeKeyField = (await this.requestInputWithOptions(
						jsonKeys,
						MessagesEditor.changeKeyFieldListPrompt,
						false
					)) as string | undefined;
				} else {
					changeKeyField = await this.requestInputText(MessagesEditor.changeKeyFieldPrompt);
				}
				if (!changeKeyField) return;
			} else {
				changeKeyValue = await this.requestInputText(MessagesEditor.changeKeyValuePrompt);
				if (!changeKeyValue) return;
			}
		}

		const executeParams: TDevTools.IExecuteParameters = { filesDetails: supportedFiles };
		if (changeKeyField) executeParams.changeKeyField = changeKeyField;
		else if (changeKeyValue) executeParams.changeKeyValue = changeKeyValue;

		this.executeCommand("changekey", executeParams);
	}

	/**
	 * Handles the Menu Command 'retrieve'
	 *
	 * @param {string[]} files - selected files paths
	 * @returns {void}
	 */
	handleRetrieveCommand(files: TDevTools.IExecuteFileDetails[]): void {
		// Get the selected project paths without deplicates
		const selectedProjectPaths = Lib.removeDuplicates(files.map(file => file.projectPath)) as string[];
		selectedProjectPaths.forEach(async selectedProjectPath => {
			// Filter the files by the selected project path and if exists any credential folder
			const filesByProject = files.filter(file => file.projectPath === selectedProjectPath);
			// Filter the files by the selected project path and if exists any credential folder
			const credentialFolders = filesByProject.filter(file => file.level === "cred_folder");
			// Filter the files by the selected project path and if exists any business unit folder
			const buFolders = filesByProject.filter(file => file.level === "bu_folder");

			if (credentialFolders.length) {
				const newFiles: TDevTools.IExecuteFileDetails[] = [];
				for (const credential of credentialFolders) {
					// Requests user to select a business unit to retrieve
					const selectedBU = (await this.selectBusinessUnits(selectedProjectPath, {
						multiBUs: false,
						credential: credential.credentialsName
					})) as string[];

					if (!selectedBU.length) continue;

					const businessUnitsPaths = selectedBU.map(
						businessUnit => `${credential.path}/${businessUnit.split("/")[1]}`
					);
					newFiles.push(...this.mcdev.convertPathsToFiles(businessUnitsPaths));
				}
				files = newFiles;
			} else if (buFolders.length) {
				// Requests yser to select the metadata types to retrieve
				const selectedMDTypes = (await this.selectMetaDataTypes("retrieve")) as string[];
				if (!selectedMDTypes.length) return;

				// creates an array of paths for each business unit folder and metadata types selected
				const mdTypesPaths = selectedMDTypes.flatMap(mdType =>
					buFolders.map(buFolder => `${buFolder.path}/${mdType}`)
				);
				files = this.mcdev.convertPathsToFiles(mdTypesPaths);
			}
			// Filter out metadata types that do not support retrieve (catches custom/demo folder names)
			const retrieveFiles = this.filterSupportedFiles(files, "retrieve");
			if (!retrieveFiles.length) return;
			this.executeCommand("retrieve", { filesDetails: retrieveFiles });
		});
	}

	/**
	 * Selects business units based on the provided project path and options.
	 *
	 * @param {string} projectPath - The path to the project.
	 * @param {Object} options - The options for selecting business units.
	 * @param {boolean} options.multiBUs - Indicates if multiple business units can be selected.
	 * @returns {Promise<string[] | undefined>} A promise that resolves to an array of selected business units or undefined.
	 * @throws {Error} If no credentials or business units are found.
	 */
	async selectBusinessUnits(
		projectPath: string,
		{ multiBUs, credential }: { multiBUs: boolean; credential?: string }
	): Promise<string[] | undefined> {
		// Get the credentials and business units from the mcdevrc file
		const projectCredsConfig = this.mcdev.retrieveProjectCredentialsConfig(projectPath);
		// Get the credentials from the mcdevrc file
		const credentials = projectCredsConfig.getAllCredentials();
		let selectedCred: string | undefined;
		let selectedBUs: string[] | undefined;
		let errorMessage = "";

		// Skip credential selection if a credential is provided
		if (credential && credentials.includes(credential)) selectedCred = credential;
		// Skip user selection if only one credential is found
		else if (credentials.length === 1) selectedCred = credentials[0];
		// Request user to select a credential if multiple credentials are found
		else if (credentials.length > 1)
			// Request user to select a credential
			selectedCred = (await this.requestInputWithOptions(credentials, MessagesEditor.credentialPrompt, false)) as
				| string
				| undefined;
		else {
			// Show error message if no credentials are found in the mcdevrc file
			errorMessage = MessagesEditor.noCredentialFound;
		}

		// If a credential is selected, request user to select a business unit
		if (selectedCred) {
			// Get the business units associated with the selected credential
			const businessUnits = projectCredsConfig.getBusinessUnitsByCredential(selectedCred);
			// Skip user selection if only one business unit is found
			if (businessUnits.length === 1) selectedBUs = [businessUnits[0]];
			else if (businessUnits.length > 1) {
				// Request user to select a business unit
				selectedBUs = (await this.requestInputWithOptions(
					businessUnits,
					MessagesEditor.businessUnitsPrompt,
					multiBUs
				)) as string[] | undefined;
			} else {
				// Show error message if no business units are found for the selected credential
				errorMessage = MessagesEditor.noBusinessUnitsFound(selectedCred);
			}
		}

		// Return the selected business units
		if (selectedCred && selectedBUs) return [selectedBUs].flat().map(bu => `${selectedCred}/${bu}`);
		// Show error message if no credential or business units are found
		if (errorMessage) {
			this.writeLog(this.mcdev.getPackageName(), errorMessage, EnumsExtension.LoggerLevel.WARN);
			const openConfigFile = await this.showInformationMessage("error", errorMessage, ["Open config file"]);
			// Open the mcdevrc file in the editor
			if (openConfigFile) this.openFileInEditor(`${this.mcdev.getConfigFilePath(projectPath)}`);
			throw new Error(errorMessage);
		}
		return [];
	}

	async selectMetaDataTypes(action: string) {
		try {
			const metadataTypes = this.mcdev.retrieveSupportedMetadataDataTypes(action);
			const metadataTypesNames = metadataTypes.map(mdTypes => mdTypes.name).sort();
			const selectedMDTypes = (await this.requestInputWithOptions(
				metadataTypesNames,
				MessagesEditor.metaDataTypePrompt,
				true
			)) as string | undefined;
			if (selectedMDTypes)
				return metadataTypes
					.filter(mdType => selectedMDTypes.includes(mdType.name))
					.map(mdType => mdType.apiName);
			return [];
		} catch (error) {
			this.writeLog(this.mcdev.getPackageName(), error as string, EnumsExtension.LoggerLevel.WARN);
			return;
		}
	}

	/**
	 * Generates a status bar title string with an icon and name.
	 *
	 * @param iconName - The name of the icon to be displayed in the status bar.
	 * @param name - The name to be displayed next to the icon in the status bar.
	 * @returns The formatted status bar title string.
	 */
	getStatusBarTitle(iconName: string, name: string): string {
		// Get the status bar icon based on the icon name
		const statusBarIcon = EnumsExtension.StatusBarIcon[iconName as keyof typeof EnumsExtension.StatusBarIcon];
		// Codicon names consist only of letters, digits, and hyphens; emoji/unicode chars are used directly
		const iconText = /^[a-zA-Z0-9-]+$/.test(statusBarIcon) ? `$(${statusBarIcon})` : statusBarIcon;
		return `${iconText} ${name}`;
	}

	/**
	 * Updates the status bar with the specified name, title, and color.
	 *
	 * @param name - The name of the status bar item to update.
	 * @param title - The text to display in the status bar.
	 * @param color - The background color of the status bar item.
	 * @returns void
	 */
	updateStatusBar(name: string, title: string, color: string): void {
		this.updateContainers(name, { text: title, backgroundColor: color });
	}

	/**
	 * Executes a given command with specified parameters and updates the status bar and logs accordingly.
	 *
	 * @param {string} command - The command to be executed.
	 * @param {TDevTools.IExecuteParameters} executeParameters - The parameters required for command execution.
	 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating the success of the command execution.
	 *
	 */
	executeCommand(command: string, executeParameters: TDevTools.IExecuteParameters): Promise<boolean> {
		console.log("== Execute Menu Commands == ");
		// Gets the package name from the mcdev instance
		const packageName = this.mcdev.getPackageName();
		// Sets the status bar title and icon based on the command execution
		const initialStatusBarTitle = this.getStatusBarTitle(command, packageName);

		// Create a new session-scoped VSCE logger for this command execution to avoid
		// shared mutable state when multiple commands run concurrently
		const sessionLogger = new VsceLogger();
		try {
			const workspacePath = this.vscodeEditor.getWorkspace().getWorkspaceFsPath();
			sessionLogger.startSession(workspacePath);
		} catch {
			// If the workspace path is unavailable, file logging is skipped for this session
		}

		// Tracks the progress-bar reporter so executeOnOutput can update the popup message
		let progressReporter: TEditor.ProgressBar | null = null;
		// Tracks the last full mcdev command string (used in the cancellation log message)
		let lastRunCommand = "";

		/**
		 * Executes logging based on the provided output information.
		 * When an info line begins with the "Running DevTools Command:" prefix it also
		 * updates the progress-bar popup to show the actual mcdev command (without
		 * --noLogColors which adds no value in the UI) and records it for the cancel log.
		 *
		 * @param {Object} param - The output logger object.
		 * @param {string} [param.info=""] - Informational message to log.
		 * @param {string} [param.output=""] - Output message to log.
		 * @param {string} [param.error=""] - Error message to log.
		 */
		const executeOnOutput = ({ info = "", output = "", error = "" }: TUtils.IOutputLogger) => {
			const message = info || output || error;
			// Sets the logger level according to the output received
			let loggerLevel = EnumsExtension.LoggerLevel.DEBUG;
			if (info) loggerLevel = EnumsExtension.LoggerLevel.INFO;
			if (output) loggerLevel = EnumsExtension.LoggerLevel.OUTPUT;
			if (error) loggerLevel = EnumsExtension.LoggerLevel.WARN;

			// When a "Running DevTools Command: ..." info line arrives, extract the mcdev
			// command and update the progress-bar notification to show it (minus --noLogColors).
			const runningPrefix = `${MessagesDevTools.mcdevRunningCommand} `;
			const trimmedInfo = info.trimStart();
			if (info && trimmedInfo.startsWith(runningPrefix)) {
				lastRunCommand = trimmedInfo.slice(runningPrefix.length).trimEnd();
				if (progressReporter) {
					const displayCommand = lastRunCommand
						.replace(/ --noLogColors/g, "")
						.replace(/ --y/g, "")
						.trimEnd();
					progressReporter.report({ message: `Running ${displayCommand}` });
				}
			}

			this.writeLog(packageName, message, loggerLevel, sessionLogger);
		};

		/**
		 * Executes actions based on the result of a command.
		 *
		 * @param success - A boolean indicating whether the command was successful.
		 * @param resolveCommand - A function to resolve the command with a boolean value.
		 *
		 * @returns A promise that resolves when the actions are completed.
		 */
		const executeOnResult = async (success: boolean, resolveCommand: (value: boolean) => void) => {
			const statusBarIcon = success ? "success" : "error";
			// changes the status bar icon and and color according to the execution result of the command
			const newStatusBarColor = success ? "" : "error";
			const newStatusBarTitle = this.getStatusBarTitle(statusBarIcon, packageName);

			// Sets the message to show in the modal depending on the execution result
			const infoMessage = success ? MessagesEditor.runningCommandSuccess : MessagesEditor.runningCommandFailure;

			// Options to be displayed in the modal message
			const infoMessageOptions = ["More Details"];
			this.updateStatusBar(packageName, newStatusBarTitle, newStatusBarColor);

			if (!success)
				// Changes back the status bar icon and backaground color to inital configuration after some time
				Lib.executeAfterDelay(
					() => this.updateStatusBar(packageName, this.getStatusBarTitle("success", packageName), ""),
					ConfigExtension.delayTimeUpdateStatusBar
				);

			// End the VSCE log session – deletes the log file when the command succeeded without errors
			sessionLogger.endSession(success);

			resolveCommand(success);

			// Shows the modal message with the result of the command execution
			const moreDetails = await this.showInformationMessage(
				success ? "info" : "error",
				infoMessage,
				infoMessageOptions
			);
			// if user clicks on 'More Details' button it will open the output channel
			if (moreDetails) this.showOuputChannel(packageName);
		};

		// Updates the status bar with the initial configuration
		this.updateStatusBar(packageName, initialStatusBarTitle, "");

		// Execute the commands asynchronously
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async resolveCommand => {
			this.activateNotificationProgressBar(
				"",
				true,
				(progress, cancelToken) =>
					// eslint-disable-next-line no-async-promise-executor
					new Promise(async resolveExecute => {
						// Capture the reporter so executeOnOutput can update the popup message
						progressReporter = progress;
						// Show a placeholder message immediately while the command is being prepared
						progress.report({ message: MessagesEditor.runningCommand });
						const { success }: { success: boolean } = await this.mcdev.execute(
							command,
							executeOnOutput,
							executeParameters,
							cancelToken
						);
						if (cancelToken.isCancellationRequested) {
							this.writeLog(
								packageName,
								MessagesEditor.runningCommandCancelled(lastRunCommand),
								EnumsExtension.LoggerLevel.INFO,
								sessionLogger
							);
							this.updateStatusBar(packageName, this.getStatusBarTitle("cancel", packageName), "");
							// Reset status bar icon back to default after a delay, same as after an error
							Lib.executeAfterDelay(
								() =>
									this.updateStatusBar(
										packageName,
										this.getStatusBarTitle("success", packageName),
										""
									),
								ConfigExtension.delayTimeUpdateStatusBar
							);
							// End the VSCE log session on cancellation – keep the log file since the command did not succeed
							sessionLogger.endSession(false);
							resolveCommand(false);
						} else {
							executeOnResult(success, resolveCommand);
						}
						resolveExecute(success);
					})
			);
		});
	}
}
export default DevToolsExtension;
