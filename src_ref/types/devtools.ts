interface IConfig {
	extensionName: string;
	requiredFiles: string[];
	recommendedExtensions: string[];
	menuCommands: string[];
}

interface SupportCommands {
	retrieve: boolean;
	create: boolean;
	update: boolean;
	delete: boolean;
	changeKey: boolean | null;
	buildTemplate: boolean;
	retrieveAsTemplate: boolean;
}

interface MetadataTypes {
	name: string;
	apiName: string;
	retrieveByDefault: string[] | boolean;
	supports: SupportCommands;
	description: string;
}

export { IConfig, MetadataTypes };
