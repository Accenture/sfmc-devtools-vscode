import { VSCode } from "@types";

/**
 * VSCode Extensions class
 *
 * @class VSCodeExtensions
 * @typedef {VSCodeExtensions}
 */
class VSCodeExtensions {
	/**
	 * VScode extensions instance
	 *
	 * @private
	 * @type {typeof VSCode.extensions}
	 */
	private extensions: typeof VSCode.extensions = VSCode.extensions;

	/**
	 * Checks if an extension is installed
	 *
	 * @param {string} extensionName - extension name
	 * @returns {boolean} true if the extension is installed else false
	 */
	isExtensionInstalled(extensionName: string): boolean {
		return this.extensions.getExtension(extensionName) !== undefined;
	}
}

export default VSCodeExtensions;
