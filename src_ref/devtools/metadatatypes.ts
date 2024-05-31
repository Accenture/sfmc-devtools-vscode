import { IDevTools } from "@types";
import { metadataTypesList } from "@config";

class MetadataTypes {
	private metadataTypes: IDevTools.MetadataTypes[] = [];

	constructor() {
		this.metadataTypes = metadataTypesList;
	}

	extractFileName(mdt: string, file: string[]) {
		console.log("== MetadataTypes ExtractFileName ==");
		console.log(mdt);
		console.log(file);
	}
}

export default MetadataTypes;
