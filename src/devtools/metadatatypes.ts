import { File } from "utils";

/**
 * MetadataTypes class
 *
 * @class MetadataTypes
 * @typedef {MetadataTypes}
 */
class MetadataTypes {
	/**
	 * Creates an instance of MetadataTypes.
	 *
	 * @constructor
	 */
	constructor() {}

	/**
	 * Handles Metadata Type name configuration for specific cases
	 *
	 * @param {string} mdt - metadata type name
	 * @param {string[]} files - files configuration
	 * @returns {{ filename?: string; metadataTypeName?: string }} file name and metadata type name configured
	 */
	handleFileConfiguration(mdt: string, files: string[]): { filename?: string; metadataTypeName?: string } {
		console.log("== MetadataTypes ExtractFileName ==");
		if (mdt === "asset") {
			const [assetName, filename] = files;

			// configuration for asset mdtype
			if (files.length === 1) return { metadataTypeName: `asset-${assetName}` };
			else if (files.length > 1)
				return { metadataTypeName: `asset`, filename: File.extractFileNameFromPath(filename) };
		}

		if (files.length === 1 || mdt === "folder") {
			// configuration for other mdtypes
			const filename = File.extractFileNameFromPath(files[0]);
			if (filename) return { filename };
		}
		return { filename: "" };
	}
}

export default MetadataTypes;
