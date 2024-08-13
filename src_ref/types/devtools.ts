interface IConfig {
	extensionName: string;
	requiredFiles: string[];
	recommendedExtensions: string[];
	menuCommands: string[];
}

interface ISupportCommands {
	retrieve: boolean;
	create: boolean;
	update: boolean;
	delete: boolean;
	changeKey: boolean | null;
	buildTemplate: boolean;
	retrieveAsTemplate: boolean;
}

interface IMetadataTypes {
	name: string;
	apiName: string;
	retrieveByDefault: string[] | boolean;
	supports: ISupportCommands;
	description: string;
}

type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";

interface IFileFormat {
	level: FileLevel;
	projectPath: string;
	path: string;
	credentialsName?: string;
	businessUnit?: string;
	metadataType?: string;
	filename?: string;
}

interface ICredentials {
	eid: number;
	businessUnits: { [key: string]: number };
}

export { IConfig, IMetadataTypes, IFileFormat, ICredentials };
