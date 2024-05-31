import { IDevTools } from "@types";
import { metadataTypesList } from "@config";

class MetadataTypes {
	private metadataTypes: IDevTools.MetadataTypes[] = [];

	constructor() {
		this.metadataTypes = metadataTypesList;
	}
}

export default MetadataTypes;
