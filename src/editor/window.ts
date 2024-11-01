import { TEditor, VSCode } from "@types";

/**
 * VSCode Window class
 *
 * @class VSCodeWindow
 * @typedef {VSCodeWindow}
 */
class VSCodeWindow {
	/**
	 * Vscode window instance
	 *
	 * @private
	 * @type {typeof VSCode.window}
	 */
	private window: typeof VSCode.window = VSCode.window;
	/**
	 * Map of all status bars
	 *
	 * @private
	 * @type {{ [name: string]: VSCode.StatusBarItem }}
	 */
	private statusBarItems: { [name: string]: VSCode.StatusBarItem };
	/**
	 * Map of all output channels
	 *
	 * @private
	 * @type {{ [name: string]: VSCode.OutputChannel }}
	 */
	private outputChannelItems: { [name: string]: VSCode.OutputChannel };

	/**
	 * Creates an instance of VSCodeWindow.
	 *
	 * @constructor
	 */
	constructor() {
		this.statusBarItems = this.outputChannelItems = {};
	}

	/**
	 * Shows the information message modal with specific options
	 *
	 * @async
	 * @param {string} message - modal message
	 * @param {string[]} actions - modal action options
	 * @returns {Promise<string | undefined>} option selected by user or undefined if no selection
	 */
	async showInformationMessageWithOptions(
		message: string,
		actions: string[],
		modal: boolean
	): Promise<string | undefined> {
		const response = await this.window.showInformationMessage(message, { modal }, ...actions);
		return response;
	}

	/**
	 * Shows the error message modal with specific options
	 *
	 * @async
	 * @param {string} message - modal error message
	 * @param {string[]} actions - modal action options
	 * @returns {Promise<string | undefined>} option selected by user or undefined if no selection
	 */
	async showErrorMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response = await this.window.showErrorMessage(message, ...actions);
		return response;
	}

	/**
	 * Shows the in progress modal
	 *
	 * @async
	 * @param {string} title - modal message
	 * @param {TEditor.ProgressWindowLocal} local - location at the editor
	 * @param {boolean} cancellable - indicates either the modal in cancellable or not
	 * @param {(
	 * 			progress: TEditor.ProgressBar,
	 * 			cancelToken: TEditor.ProgressBarCancellation
	 * 		) => Thenable<unknown>} progressHandler - handler function when modal is running
	 * @returns {Promise<void>}
	 */
	async showProgressBar(
		title: string,
		local: TEditor.ProgressWindowLocal,
		cancellable: boolean,
		progressHandler: (
			progress: TEditor.ProgressBar,
			cancelToken: TEditor.ProgressBarCancellation
		) => Thenable<unknown>
	): Promise<void> {
		this.window.withProgress(
			{ title, location: VSCode.ProgressLocation[local as keyof typeof VSCode.ProgressLocation], cancellable },
			progressHandler
		);
	}

	/**
	 * Creates an ouput channel
	 *
	 * @param {string} name - output channel name
	 * @return {void}
	 */
	createOutputChannel(name: string): void {
		const outputChannel = this.window.createOutputChannel(name);
		if (!outputChannel)
			throw new Error(`[vscodewindow_createOutputChannel]: Failed to create OutputChannel with name '${name}'.`);
		this.outputChannelItems = { ...this.outputChannelItems, [name]: outputChannel };
	}

	/**
	 * Gets the output channel by name
	 *
	 * @param {string} name - name of the output channel
	 * @returns {VSCode.OutputChannel} output channel for a specific name
	 */
	getOutputChannel(name: string): VSCode.OutputChannel {
		if (!this.outputChannelItems || !this.outputChannelItems[name]) this.createOutputChannel(name);
		return this.outputChannelItems[name];
	}

	/**
	 * Displays the output channel in the editor
	 *
	 * @param {string} name - name of the output channel
	 * @return {void}
	 */
	displayOutputChannel(name: string): void {
		const outputChannel = this.getOutputChannel(name);
		outputChannel.show();
	}

	/**
	 * Adds text to the ouptut channel
	 *
	 * @param {string} name - name of the output channel
	 * @param {string} text - message displayed in the output channel
	 * @return {void}
	 */
	appendTextToOutputChannel(name: string, text: string): void {
		const outputChannel = this.getOutputChannel(name);
		outputChannel.appendLine(text);
	}

	/**
	 * Creates a Status Bar
	 *
	 * @param {string} command - status bar command action
	 * @param {string} title - status bar title
	 * @param {string} name - status bar name
	 * @return {void}
	 */
	createStatusBarItem(command: string, title: string, name: string): void {
		const statusBarItem = this.window.createStatusBarItem(VSCode.StatusBarAlignment.Right, 110);
		statusBarItem.name = name;
		statusBarItem.command = command;
		statusBarItem.text = title;
		this.statusBarItems = { ...this.statusBarItems, [name]: statusBarItem };
	}

	/**
	 * Gets a status bar by name
	 *
	 * @param {string} name - name of the status bar
	 * @returns {VSCode.StatusBarItem} status bar for a specific name
	 */
	getStatusBarItem(name: string): VSCode.StatusBarItem {
		if (!this.statusBarItems[name])
			throw new Error(`[vscodewindow_getStatusBarItem]: Status Bar Item with name '${name}' wasn't found.`);
		return this.statusBarItems[name];
	}

	/**
	 * Displays a status bar by name
	 *
	 * @param {string} name - name of the status bar
	 * @return {void}
	 */
	displayStatusBarItem(name: string): void {
		const statusBarItem = this.getStatusBarItem(name);
		if (statusBarItem) statusBarItem.show();
	}

	/**
	 * Updates a status bar field
	 *
	 * @param {string} name - name of the status bar
	 * @param {{ [key in TEditor.StatusBarFields]?: string }} fieldsToUpdate - status bar fields name and values to be updated
	 * @return {void}
	 */
	updateStatusBarItem(name: string, fieldsToUpdate: { [key in TEditor.StatusBarFields]?: string }): void {
		const statusBarItem = this.getStatusBarItem(name);
		Object.entries(fieldsToUpdate).forEach(([field, value]) => {
			if (field === "text") statusBarItem[field] = value;
			else if (field === "backgroundColor")
				statusBarItem[field] = new VSCode.ThemeColor(`statusBarItem.${value}Background`);
		});
	}

	/**
	 * Gets the current opened file path
	 *
	 * @returns {string} - opened file path
	 */
	getEditorOpenedFilePath(): string {
		const activeTextEditor = this.window.activeTextEditor;
		if (!activeTextEditor)
			throw new Error("[vscodewindow_getEditorOpenedFilePath]: Active text editor is undefined.");
		return activeTextEditor.document.uri.path;
	}

	createTreeView() {
		return this.window.createTreeView("sfmc-devtools-vscode-actions", {
			treeDataProvider: {
				getTreeItem: () => ({ label: "test1", id: "test_1" }),
				getChildren: () => ["test1"]
			},
			showCollapseAll: true
		});
	}
}

export default VSCodeWindow;
