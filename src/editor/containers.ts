// import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";
// import { devToolsExtension } from "../devtools/extension";

import { window, StatusBarItem, StatusBarAlignment } from "vscode";

// // TODO

// export function activateEditorSettings(context: ExtensionContext): void {
//     createCommandStatusBar(context);
//     createContextMenus(context);
//     devToolsExtension.init();
// }

// function createCommandStatusBar( { subscriptions }: ExtensionContext): void {

//     let statusBarCredBU: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 110);
//     statusBarCredBU.command = devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCredential.command;
//     statusBarCredBU.text = devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCredential.title;
//     statusBarCredBU.show();

//     let statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
//     statusBar.command = devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCommand.command;
//     statusBar.text = devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCommand.title;
//     statusBar.show();

//     subscriptions.push(
//         commands.registerCommand(statusBarCredBU.command, () => credentialBUBarHandler(statusBarCredBU)),
//         commands.registerCommand(statusBar.command, () => commandBarHandler(statusBarCredBU))
//     );
//     subscriptions.push(statusBarCredBU, statusBar);
// }

// async function credentialBUBarHandler(statusBarCredBU: StatusBarItem): Promise<void> {
//     const selectedCredentialBU = await devToolsExtension.handleCredentialChange();
//     statusBarCredBU.text = selectedCredentialBU ? 
//         `DT:${selectedCredentialBU}` : 
//             devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCredential.title; 
// }

// function commandBarHandler(statusBarCredBU: StatusBarItem){
//     const { text } = statusBarCredBU;
//     devToolsExtension.handleCommandSelection(text === devToolsExtension.DEVTOOLS_STATUS_BAR_CREDBU.dtCredential.title ? 
//         "" : 
//         text.split(":")[1]
//     );
// }

// async function createContextMenus({ subscriptions }: ExtensionContext): Promise<void> {
//     subscriptions.push(
//         commands.registerCommand(devToolsExtension.DEVTOOLS_MENU_ACTION_COMMAND_RETRIEVE, 
//             ({ path }: { path: string}) => devToolsExtension.executeExplorerMenuAction("retrieve", path)),
//         commands.registerCommand(devToolsExtension.DEVTOOLS_MENU_ACTION_COMMAND_DEPLOY, 
//             ({ path }: { path: string}) => devToolsExtension.executeExplorerMenuAction("deploy", path))
//     );
// }

function createStatusBarItem(command: string, title: string, name: string): StatusBarItem {
    let statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 110);
    statusBar.name = name;
    statusBar.command = command;
    statusBar.text = title;
    return statusBar;
}

function displayStatusBarItem(statusBar: StatusBarItem | StatusBarItem[]): StatusBarItem | StatusBarItem[] {
    [statusBar]
        .flat() 
        .forEach((sbi: StatusBarItem) => sbi.show());
    return statusBar;
}

const editorContainers = {
    createStatusBarItem,
    displayStatusBarItem
};

export { StatusBarItem, editorContainers };