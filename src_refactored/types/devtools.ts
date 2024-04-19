interface IDevToolsConfig {
	requiredFiles: string[];
}

interface IDevToolsUtils {
	isDevToolsProject: (files: string[]) => Promise<boolean>;
	subFoldersAreDevToolsProject: () => void;
}
export { IDevToolsConfig, IDevToolsUtils };
