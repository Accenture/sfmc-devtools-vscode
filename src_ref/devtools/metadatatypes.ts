import { TDevTools } from "@types";
import { CMetatadataTypes } from "@config";
import { extractFileName } from "../utils/file";

const MetadataTypesSupportedActions: { [action: string]: TDevTools.MetadataTypesActions[] } = {
	retrieve: ["retrieve"],
	deploy: ["create", "update"]
};

class MetadataTypes {
	private metadataTypes: TDevTools.IMetadataTypes[] = [];

	constructor() {
		this.metadataTypes = CMetatadataTypes.metadataTypesList;
	}

	updateMetadataTypes(mdtTypes: string) {
		if (!mdtTypes) throw new Error("");
		this.metadataTypes = JSON.parse(mdtTypes);
	}

	getSupportedActions(): string[] {
		return Object.keys(MetadataTypesSupportedActions);
	}

	isValidSupportedAction(action: string): boolean {
		const supportedActions: string[] = this.getSupportedActions();
		return supportedActions.includes(action);
	}

	isSupportedMetadataTypeByAction(action: string, metadataType: string): boolean {
		const supportedActions: TDevTools.MetadataTypesActions[] = MetadataTypesSupportedActions[action];
		console.log(metadataType);
		if (metadataType.startsWith("asset-")) metadataType = "asset";
		const [metadataTypeMap]: TDevTools.IMetadataTypes[] = this.metadataTypes.filter(
			({ apiName }: TDevTools.IMetadataTypes) => apiName === metadataType
		);

		if (!metadataTypeMap) throw new Error("...");
		return (
			supportedActions.some((action: TDevTools.MetadataTypesActions) => metadataTypeMap.supports[action]) || false
		);
	}

	handleFileConfiguration(mdt: string, files: string[]): { filename?: string; metadataTypeName?: string } {
		console.log("== MetadataTypes ExtractFileName ==");
		if (mdt === "asset") {
			const [assetName, filename]: string[] = files;

			// configuration for asset mdtype
			if (files.length === 1) return { metadataTypeName: `asset-${assetName}` };
			else if (files.length > 1)
				return { metadataTypeName: `asset-${assetName}`, filename: extractFileName(filename)[0] };
		}

		if (files.length === 1 || mdt === "folder") {
			// configuration for other mdtypes
			const filenames: string[] = extractFileName(files);
			if (filenames.length) return { filename: filenames[0] };
		}
		return { filename: "" };
	}
}

export default MetadataTypes;
