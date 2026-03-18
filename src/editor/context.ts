import { VSCode } from "@types";

/**
 * VSCode Context class
 *
 * @class VSCodeContext
 * @typedef {VSCodeContext}
 */
class VSCodeContext {
	/**
	 * Extension context
	 *
	 * @private
	 * @type {VSCode.ExtensionContext}
	 */
	private context: VSCode.ExtensionContext;
	/**
	 * Creates an instance of VSCodeContext.
	 *
	 * @constructor
	 * @param {VSCode.ExtensionContext} context
	 */
	constructor(context: VSCode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Gets the extension name
	 *
	 * @returns {string} extension name
	 */
	getExtensionName(): string {
		return this.context.extension.packageJSON.name;
	}

	/**
	 * Gets the extension version
	 *
	 * @returns {string} extension version
	 */
	getExtensionVersion(): string {
		return this.context.extension.packageJSON.version;
	}

	/**
	 * Retrieves the extension path from the context.
	 *
	 * @returns {string} The path of the extension.
	 */
	getExtensionPath(): string {
		return this.context.extensionPath;
	}

	/**
	 * Registers a disposable resource so it is cleaned up when the extension is deactivated.
	 *
	 * @param {VSCode.Disposable} disposable - The disposable to register
	 * @returns {void}
	 */
	registerDisposable(disposable: VSCode.Disposable): void {
		this.context.subscriptions.push(disposable);
	}
}

export default VSCodeContext;
