import DevToolsCommandSetting from "./devToolsCommandSetting";

interface DevToolsCommandRunner{
    commandId: string,
    commandConfig: DevToolsCommandSetting,
    commandArgs: { [key: string]: any },
    commandResultHandler: (result: any) => void
}

export default DevToolsCommandRunner;