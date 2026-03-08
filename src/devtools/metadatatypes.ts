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

	/**
	 * Gets all metadata types.
	 *
	 * @returns {TDevTools.IMetadataTypes[]} list of all metadata types
	 */
	getAllMetaDataTypes(): TDevTools.IMetadataTypes[] {
		return this.metadataTypes;
	}

	/**
	 * Retrieves the metadata types that are supported by a specific action.
	 *
	 * @param action - The action for which to retrieve the supported metadata types.
	 * @returns {TDevTools.IMetadataTypes[]} An array of metadata types that support the specified action.
	 */
	getMetaDataTypesSupportedByAction(action: string): TDevTools.IMetadataTypes[] {
		const metaDataTypeAction = MetadataTypesSupportedActions[action];
		return this.getAllMetaDataTypes().filter(mdType =>
			metaDataTypeAction.some(mdTypeAction => mdType.supports[mdTypeAction])
		);
	}

	/**
	 * Updates the metadata types list with the provided types.
	 * Returns true if any new or removed types were detected.
	 *
	 * @param {TDevTools.IMetadataTypes[]} types - updated list of metadata types
	 * @returns {boolean} true if the list changed, false otherwise
	 */
	updateMetadataTypes(types: TDevTools.IMetadataTypes[]): boolean {
		const currentApiNames = new Set(this.metadataTypes.map(t => t.apiName));
		const newApiNames = new Set(types.map(t => t.apiName));

		const hasNewTypes = types.some(t => !currentApiNames.has(t.apiName));
		const hasRemovedTypes = this.metadataTypes.some(t => !newApiNames.has(t.apiName));

		if (hasNewTypes || hasRemovedTypes) {
			this.metadataTypes = types;
			return true;
		}
		return false;
	}

	/**
	 * Checks whether the given action is supported for a specific metadata type.
	 * The apiName is matched against the beginning of the stored type's apiName to handle
	 * sub-typed names such as "asset-block" (base apiName: "asset").
	 * Unknown types are treated as supported so that future mcdev types are never blocked.
	 *
	 * @param {string} action - action to check (e.g. "delete", "deploy")
	 * @param {string} apiName - metadata type API name, optionally with subtype suffix (e.g. "asset-block")
	 * @returns {boolean} true if the action is supported or if the type is not in the cache
	 */
	isActionSupportedForType(action: string, apiName: string): boolean {
		const metaDataTypeAction = MetadataTypesSupportedActions[action];
		if (!metaDataTypeAction) return true;
		// Try exact match first; if not found, strip a subtype suffix (e.g. "asset-block" → "asset")
		// to handle asset sub-types while still correctly matching types whose base apiName contains a hyphen
		const mdType =
			this.getAllMetaDataTypes().find(t => t.apiName === apiName) ||
			this.getAllMetaDataTypes().find(t => t.apiName === apiName.split("-")[0]);
		// Unknown type → don't block (permissive fallback for future mcdev types)
		if (!mdType) return true;
		return metaDataTypeAction.some(a => mdType.supports[a]);
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
