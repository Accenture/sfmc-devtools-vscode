interface DevToolsCommandSetting {
	id: string;
	title: string;
	description: string;
	command: string;
	requiredParams: Array<string>;
	optionalParams: Array<string>;
	isAvailable: boolean;
}

export default DevToolsCommandSetting;
