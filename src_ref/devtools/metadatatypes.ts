import { TDevTools } from "@types";
import { CMetatadataTypes } from "@config";
import { extractFileName } from "../utils/file";

class MetadataTypes {
	private metadataTypes: TDevTools.IMetadataTypes[] = [];

	constructor() {
		this.metadataTypes = CMetatadataTypes.metadataTypesList;
	}

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
