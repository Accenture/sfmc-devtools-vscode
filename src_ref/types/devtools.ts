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

type MetadataCommand = { metadatatype: string; key: string };

interface ICommandParameters {
	credential: string;
	metadata: MetadataCommand[];
	optional?: string[];
}

type FileLevelMap = { [key in FileLevel]: IFileFormat[] };
type CredentialsFileMap = { [key: string]: FileLevelMap };

export {
	IConfig,
	IMetadataTypes,
	IFileFormat,
	ICredentials,
	ICommandParameters,
	FileLevelMap,
	CredentialsFileMap,
	MetadataCommand
};
