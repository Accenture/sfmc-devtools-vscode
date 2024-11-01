const extensionName = "sfmc-devtools-vscode";
const requiredFiles = [".mcdevrc.json", ".mcdev-auth.json"];
const recommendedExtensions = ["IBM.output-colorizer"];
const menuCommands = ["retrieve", "deploy", "build"];
const delayTimeUpdateStatusBar = 10000; // 10 seconds

export { extensionName, requiredFiles, recommendedExtensions, menuCommands, delayTimeUpdateStatusBar };
