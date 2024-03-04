import DevToolsCommandSetting from "./devToolsCommandSetting";

interface DevToolsCommandRunner{
    commandId: string,
    commandConfig: DevToolsCommandSetting,
    commandArgs: { [key: string]: string | string[] | boolean },
    commandPath: string,
    commandHandlers: { [key: string]: (args?: any) => void }
}

export default DevToolsCommandRunner;