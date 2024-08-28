interface SupportedMetadataTypes {
	name: string;
	apiName: string;
	retrieveByDefault: boolean | string[];
	supports: { [key: string]: boolean | null };
	description: string;
}

export default SupportedMetadataTypes;
