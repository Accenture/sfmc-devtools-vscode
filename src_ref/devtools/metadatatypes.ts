import { TDevTools } from "@types";
import { ConfigMetadataTypes } from "@config";
import { File } from "utils";

const MetadataTypesSupportedActions: { [action: string]: TDevTools.MetadataTypesActions[] } = {
	retrieve: ["retrieve"],
	deploy: ["create", "update"]
};

class MetadataTypes {
	private metadataTypes: TDevTools.IMetadataTypes[] = [];

	constructor() {
		this.metadataTypes = ConfigMetadataTypes.metadataTypesList;
	}

	updateMetadataTypes(mdtTypes: string) {
		this.metadataTypes = JSON.parse(mdtTypes);
	}

	getSupportedActions(): string[] {
		return Object.keys(MetadataTypesSupportedActions);
	}

	isValidSupportedAction(action: string): boolean {
		const supportedActions = this.getSupportedActions();
		return supportedActions.includes(action);
	}

	isSupportedMetadataTypeByAction(action: string, metadataType: string): boolean {
		const supportedActions = MetadataTypesSupportedActions[action];

		if (metadataType.startsWith("asset-")) metadataType = "asset";
		const [metadataTypeMap] = this.metadataTypes.filter(({ apiName }) => apiName === metadataType);

		if (!metadataTypeMap) throw new Error("...");
		return supportedActions.some(action => metadataTypeMap.supports[action]) || false;
	}

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
