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

	getExtensionPath(): string {
		return this.context.extensionPath;
	}
}

export default VSCodeContext;
