type FileLevel = "top_folder" | "cred_folder" | "bu_folder" | "mdt_folder" | "file";

type FileLevelMap = { [key in FileLevel]: IExecuteFileDetails[] };
type MetadataTypesActions =
	| "retrieve"
	| "create"
	| "update"
	| "delete"
	| "changeKey"
	| "buildTemplate"
	| "retrieveAsTemplate"
	| "execute"
	| "schedule"
	| "pause"
	| "stop"
	| "publish"
	| "validate"
	| "refresh";
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
	/** Optional sub-key to filter by a specific field (e.g. "name" for `dataExtension:name:"value"`). */
	metadataSubKey?: string;
	filename?: string;
}

interface IExecuteParameters {
	[parameter: string]: IExecuteFileDetails[] | IExecuteParameters | string | string[] | number | boolean;
}

interface ICredentials {
	eid: number;
	businessUnits: { [key: string]: number };
}

interface IMetadataCommand {
	metadatatype: string;
	key: string;
	/** Optional sub-key used to filter by a specific field instead of the default key.
	 *  When set, the command becomes: `-m type:subKey:"key"` (e.g. `-m dataExtension:name:"My DE"`). */
	subKey?: string;
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
	/** Optional message logged once to the user before the first command invocation. */
	preRunInfo?: string;
	/** When true the command requires an interactive terminal (e.g. init, join). */
	interactive?: boolean;
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
	metaDataTypes?: {
		retrieve?: string[];
		[key: string]: unknown;
	};
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
	MetadataTypesActionsMap,
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
