const extensionName: string = "sfmc-devtools-vscode";
const requiredFiles: string[] = [".mcdevrc.json", ".mcdev-auth.json"];
const recommendedExtensions: string[] = ["IBM.output-colorizer"];
const menuCommands: string[] = ["retrieve", "deploy", "copytobu"];
const delayTimeUpdateStatusBar: number = 10000; // 10 seconds

export { extensionName, requiredFiles, recommendedExtensions, menuCommands, delayTimeUpdateStatusBar };
