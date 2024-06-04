import { IDevTools } from "@types";
import { metadataTypesList } from "@config";

class MetadataTypes {
	private metadataTypes: IDevTools.MetadataTypes[] = [];

	constructor() {
		this.metadataTypes = metadataTypesList;
	}

	handleFileConfiguration(mdt: string, files: string[]) {
		console.log("== MetadataTypes ExtractFileName ==");
		if (mdt === "asset") {
			// configuration for asset mdtype
		}

		if (mdt === "folder") {
			// configuration for folder mdtype
		}

		if (files.length === 1) {
			// configuration for other mdtypes
		}
	}
}

export default MetadataTypes;
