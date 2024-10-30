type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";
// eslint-disable-next-line no-use-before-define
type FileLevelMap = { [key in FileLevel]: IFileFormat[] };
type MetadataTypesActions =
	| "retrieve"
	| "create"
	| "update"
	| "delete"
	| "changeKey"
	| "buildTemplate"
	| "retrieveAsTemplate";
type MetadataTypesActionsMap = {
	[key in MetadataTypesActions]: boolean;
};

interface IConfig {
	extensionName: string;
	requiredFiles: string[];
	recommendedExtensions: string[];
	menuCommands: string[];
}
interface IMetadataTypes {
	name: string;
	apiName: string;
	retrieveByDefault: string[] | boolean;
	supports: MetadataTypesActionsMap;
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
	MetadataTypesActions,
	IMetadataTypes,
	IFileFormat,
	ICredentials,
	ICommandParameters,
	ICredentialsFileMap,
	IMetadataCommand,
	ICommandConfig
};
