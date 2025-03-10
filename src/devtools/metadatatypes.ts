import { File } from "utils";
import { ConfigMetadataTypes } from "@config";
import { TDevTools } from "@types";

/**
 * Supported Metadata Types Actions
 *
 * @type {{ [action: string]: TDevTools.MetadataTypesActions[] }}
 */
const MetadataTypesSupportedActions: { [action: string]: TDevTools.MetadataTypesActions[] } = {
	retrieve: ["retrieve"],
	deploy: ["create", "update"],
	delete: ["delete"]
};

/**
 * MetadataTypes class
 *
 * @class MetadataTypes
 * @typedef {MetadataTypes}
 */
class MetadataTypes {
	/**
	 * Stores all the Metatadata Types
	 *
	 * @private
	 * @type {TDevTools.IMetadataTypes[]}
	 */
	private metadataTypes: TDevTools.IMetadataTypes[] = [];

	/**
	 * Creates an instance of MetadataTypes.
	 *
	 * @constructor
	 */
	constructor() {
		// initializes the metadata types with the default metadata types file
		this.metadataTypes = ConfigMetadataTypes.metadataTypesList;
	}

	/**
	 * Gets the list of Metatdata Types supported actions
	 *
	 * @returns {string[]} list of supported actions
	 */
	getSupportedActions(): string[] {
		return Object.keys(MetadataTypesSupportedActions);
	}

	/**
	 * Checks if a metadata type action is valid
	 *
	 * @param {string} action - metadata type action
	 * @returns {boolean} true if metadata type action is valid else false
	 */
	isValidSupportedAction(action: string): boolean {
		const supportedActions = this.getSupportedActions();
		return supportedActions.includes(action);
	}

	getAllMetaDataTypes() {
		return this.metadataTypes;
	}

	getMetaDataTypesSupportedByAction(action: string) {
		const metaDataTypeAction = MetadataTypesSupportedActions[action];
		return this.getAllMetaDataTypes().filter(mdType =>
			metaDataTypeAction.some(mdTypeAction => mdType.supports[mdTypeAction])
		);
	}

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
