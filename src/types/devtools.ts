type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";
// eslint-disable-next-line no-use-before-define
type FileLevelMap = { [key in FileLevel]: IExecuteFileDetails[] };
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

interface IExecuteFileDetails {
	level: FileLevel;
	projectPath: string;
	topFolder: string;
	path: string;
	credentialsName?: string;
	businessUnit?: string;
	metadataType?: string;
	filename?: string;
}

interface IExecuteParameters {
	[parameter: string]: IExecuteFileDetails[] | IExecuteParameters | string | number | boolean;
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

interface ICommandFileParameters {
	credential: string;
	projectPath: string;
	topFolder: string;
	metadata: IMetadataCommand[];
	optional?: string[];
}

interface ICommandParameters {
	[parameter: string]: ICommandFileParameters[] | ICommandParameters | string | number | boolean;
}

interface ICredentialsFileMap {
	[key: string]: FileLevelMap;
}

interface ICommandConfig {
	alias: string;
	config: string[][];
}

interface IConfigFileCredentials {
	eid: number;
	businessUnits: {
		[bu: string]: number;
	};
}

interface IConfigFile {
	credentials: { [credential: string]: IConfigFileCredentials };
	markets: { [bu: string]: { [suffix: string]: string } };
	marketList: { [market: string]: { description: string; [marketDef: string]: string } };
}

interface IProjectConfig {
	getAllCredentials: () => string[];
	getBusinessUnitsByCredential: (credential: string) => string[];
	getMarkets: () => string[];
	getMarketsList: () => string[];
}

export {
	FileLevelMap,
	IConfig,
	IConfigFile,
	MetadataTypesActions,
	IMetadataTypes,
	IExecuteFileDetails,
	IExecuteParameters,
	ICredentials,
	ICommandFileParameters,
	ICommandParameters,
	ICredentialsFileMap,
	IMetadataCommand,
	ICommandConfig,
	IProjectConfig
};
