import { TDevTools } from "@types";
import { ConfigMetadataTypes } from "@config";
import { File } from "utils";

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
	 * Updates the metadata types list
	 *
	 * @param {string} mdtTypes - metadata types list
	 * @return {void}
	 */
	updateMetadataTypes(mdtTypes: string): void {
		this.metadataTypes = JSON.parse(mdtTypes);
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

	/**
	 * Checks if a metadata type is supported for a specific action
	 *
	 * @param {string} action - metadata type action
	 * @param {string} metadataType - name of the metadata type
	 * @returns {boolean} true if the metadata type is supported for an action else false
	 */
	isSupportedMetadataTypeByAction(action: string, metadataType: string): boolean {
		const supportedActions = MetadataTypesSupportedActions[action];

		// when metadata type name is asset-[subtype] the name is changed
		if (metadataType.startsWith("asset-")) metadataType = "asset";
		const [metadataTypeMap] = this.metadataTypes.filter(({ apiName }) => apiName === metadataType);

		return supportedActions.some(action => metadataTypeMap.supports[action]) || false;
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
				return { metadataTypeName: `asset-${assetName}`, filename: File.extractFileName(filename)[0] };
		}

		if (files.length === 1 || mdt === "folder") {
			// configuration for other mdtypes
			const filenames = File.extractFileName(files);
			if (filenames.length) return { filename: filenames[0] };
		}
		return { filename: "" };
	}
}

export default MetadataTypes;
