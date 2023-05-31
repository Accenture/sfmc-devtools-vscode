import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { devToolsCommands } from "./devToolsCommands";
import { log } from "./editorLogger";

const DEVTOOLS_STATUS_BAR_CREDBU: string = "sfmc-devtools-vscext.credbu";
const DEVTOOLS_STATUS_BAR_CREDBU_TITLE: string = "DT:Credential/BU";

const DEVTOOLS_STATUS_BAR_COMMAND: string = "sfmc-devtools-vscext.command";
const DEVTOOLS_STATUS_BAR_COMMAND_TITLE: string = "DT:Command";

const DEVTOOLS_MENU_ACTION_COMMAND_RETRIEVE: string = "sfmc-devtools-vscext.devToolsMenuActionRetrieve";
const DEVTOOLS_MENU_ACTION_COMMAND_DEPLOY: string = "sfmc-devtools-vscext.devToolsMenuActionDeploy";
const DEVTOOLS_MENU_ACTION_FOLDER_NAME: string = "sfmc-devtools-vscext.menuActionFolder";
const DEVTOOLS_MENU_ACTION_TYPES_FOLDER_NAME: string = "sfmc-devtools-vscext.menuActionTypesFolder";

export function activateEditorSettings(context: ExtensionContext){
    createCommandStatusBar(context);
    createContextMenus(context);
}

function createCommandStatusBar( { subscriptions }: ExtensionContext){
    let statusBarCredBU: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 110);
    statusBarCredBU.command = DEVTOOLS_STATUS_BAR_CREDBU;
    statusBarCredBU.text = DEVTOOLS_STATUS_BAR_CREDBU_TITLE;
    statusBarCredBU.show();

    let statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    statusBar.command = DEVTOOLS_STATUS_BAR_COMMAND;
    statusBar.text = DEVTOOLS_STATUS_BAR_COMMAND_TITLE;
    statusBar.show();

    subscriptions.push(
        commands.registerCommand(DEVTOOLS_STATUS_BAR_CREDBU, () => credentialBUHandler(statusBarCredBU)),
        commands.registerCommand(DEVTOOLS_STATUS_BAR_COMMAND, () => commandBarHandler(statusBarCredBU))
    );
    subscriptions.push(statusBarCredBU, statusBar);
    log("info", "Activated command status bar...");
}

async function credentialBUHandler(statusBarCredBU: StatusBarItem){
    const selectedCredentialBU = await devToolsCommands.executeCredentialsSelection();
    statusBarCredBU.text = selectedCredentialBU ? `DT:${selectedCredentialBU}` : DEVTOOLS_STATUS_BAR_CREDBU_TITLE; 
}

function commandBarHandler(statusBarCredBU: StatusBarItem){
    const { text } = statusBarCredBU;
    devToolsCommands.executeCommandBarSelection( text === DEVTOOLS_STATUS_BAR_CREDBU_TITLE ? "" : text.split(":")[1]);
}


async function createContextMenus({ subscriptions }: ExtensionContext){
    subscriptions.push(
        commands.registerCommand(DEVTOOLS_MENU_ACTION_COMMAND_RETRIEVE, ({ path }: { path: string}) => devToolsCommands.executeExplorerMenuAction("retrieve", path)),
        commands.registerCommand(DEVTOOLS_MENU_ACTION_COMMAND_DEPLOY, ({ path }: { path: string}) => devToolsCommands.executeExplorerMenuAction("deploy", path))
    );
}