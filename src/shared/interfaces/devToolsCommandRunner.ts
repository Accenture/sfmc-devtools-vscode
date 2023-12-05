import DevToolsCommandSetting from "./devToolsCommandSetting";

interface DevToolsCommandRunner{
    commandId: string,
    commandConfig: DevToolsCommandSetting,
    commandArgs: { [key: string]: any },
    commandPath: string,
    commandResultHandler: (result: any) => void
}

export default DevToolsCommandRunner;