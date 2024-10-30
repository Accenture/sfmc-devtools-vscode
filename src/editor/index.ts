import { TEditor } from "@types";

/**
 * VSCode Editor class
 *
 * @class VSCodeEditor
 * @typedef {VSCodeEditor}
 */
class VSCodeEditor {
	/**
	 * VSCodeContext class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeContext}
	 */
	private vscodeContext: TEditor.VSCodeContext;
	/**
	 * VSCodeWorkspace class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeWorkspace}
	 */
	private vscodeWorkspace: TEditor.VSCodeWorkspace;
	/**
	 * VSCodeWindow class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeWindow}
	 */
	private vscodeWindow: TEditor.VSCodeWindow;
	/**
	 * VSCodeCommands class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeCommands}
	 */
	private vscodeCommands: TEditor.VSCodeCommands;
	/**
	 * VSCodeExtensions class instance
	 *
	 * @private
	 * @type {TEditor.VSCodeExtensions}
	 */
	private vscodeExtensions: TEditor.VSCodeExtensions;
	/**
	 * Creates an instance of VSCodeEditor.
	 *
	 * @constructor
	 * @param {TEditor.IExtensionContext} context
	 */
	constructor(context: TEditor.IExtensionContext) {
		this.vscodeContext = new TEditor.VSCodeContext(context);
		this.vscodeWorkspace = new TEditor.VSCodeWorkspace();
		this.vscodeWindow = new TEditor.VSCodeWindow();
		this.vscodeCommands = new TEditor.VSCodeCommands();
		this.vscodeExtensions = new TEditor.VSCodeExtensions();
	}

	/**
	 * Retrieves a VSCodeContext instance
	 *
	 * @returns {TEditor.VSCodeContext}
	 */
	getContext() {
		return this.vscodeContext;
	}

	/**
	 * Retrieves a VSCodeWorkspace instance
	 *
	 * @returns {TEditor.VSCodeWorkspace}
	 */
	getWorkspace() {
		return this.vscodeWorkspace;
	}

	/**
	 * Retrieves a VSCodeWindow instance
	 *
	 * @returns {TEditor.VSCodeWindow}
	 */
	getWindow() {
		return this.vscodeWindow;
	}

	/**
	 * Retrieves a VSCodeCommands instance
	 *
	 * @returns {TEditor.VSCodeCommands}
	 */
	getCommands() {
		return this.vscodeCommands;
	}

	/**
	 * Retrieves a VSCodeExtensions instance
	 *
	 * @returns {TEditor.VSCodeExtensions}
	 */
	getExtensions() {
		return this.vscodeExtensions;
	}
}

export default VSCodeEditor;
