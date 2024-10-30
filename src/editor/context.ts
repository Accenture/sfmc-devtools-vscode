import { TEditor } from "@types";

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
	 * @type {TEditor.IExtensionContext}
	 */
	private context: TEditor.IExtensionContext;
	/**
	 * Creates an instance of VSCodeContext.
	 *
	 * @constructor
	 * @param {TEditor.IExtensionContext} context
	 */
	constructor(context: TEditor.IExtensionContext) {
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
}

export default VSCodeContext;
