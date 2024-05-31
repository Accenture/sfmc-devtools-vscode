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

type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";

interface FileFormat {
	level: FileLevel;
	projectPath: string;
	credentialsName?: string;
	businessUnit?: string;
	metadataType?: string;
	name?: string;
}

export { IConfig, MetadataTypes, FileFormat };
