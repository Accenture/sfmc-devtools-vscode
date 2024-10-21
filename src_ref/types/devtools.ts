type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";
type FileLevelMap = { [key in FileLevel]: IFileFormat[] };

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

interface IFileFormat {
	level: FileLevel;
	projectPath: string;
	topFolder: string;
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

interface IMetadataCommand {
	metadatatype: string;
	key: string;
	path: string;
	fromRetrieveFolder?: boolean;
}

interface ICommandParameters {
	credential: string;
	projectPath: string;
	topFolder: string;
	metadata: IMetadataCommand[];
	optional?: string[];
}

interface ICredentialsFileMap {
	[key: string]: FileLevelMap;
}

interface ICommandConfig {
	alias: string;
	config: string[][];
}

export {
	FileLevelMap,
	IConfig,
	IMetadataTypes,
	IFileFormat,
	ICredentials,
	ICommandParameters,
	ICredentialsFileMap,
	IMetadataCommand,
	ICommandConfig
};
