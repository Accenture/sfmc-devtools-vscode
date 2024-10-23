import { TDevTools } from "@types";
import { CMetatadataTypes } from "@config";
import { extractFileName } from "../utils/file";

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
		if (this.metadataTypes.length) return Object.keys(this.metadataTypes[0].supports);
		else throw new Error("");
	}

	isValidSupportedAction(action: string): boolean {
		const supportedActions: string[] = this.getSupportedActions();
		return supportedActions.includes(action) || action === "deploy";
	}

	isSupportedActionForMetadataType(action: string, metadataType: string) {}

	handleFileConfiguration(mdt: string, files: string[]): { filename?: string; metadataType?: string } {
		console.log("== MetadataTypes ExtractFileName ==");
		if (mdt === "asset") {
			const [assetName, filename]: string[] = files;
			// configuration for asset mdtype
			if (files.length === 1) return { metadataType: `asset-${assetName}` };
			else if (files.length > 1)
				return { metadataType: `asset-${assetName}`, filename: extractFileName(filename)[0] };
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
