// import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";
// import { devToolsExtension } from "../devtools/extension";

import { window, StatusBarItem, StatusBarAlignment } from "vscode";

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