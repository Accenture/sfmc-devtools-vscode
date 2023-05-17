import { window, ViewColumn, Uri, ExtensionContext, ProgressLocation } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execInTerminal } from '../../shared/utils/terminal';
import { initHelper } from './initHelper';
import { isDevToolsInstalled } from '../prerequisites';

const MESSAGES: {[key: string]: string } = {
    noPreRequisites: "The Pre-Requisites required to run SFMC DevTools are missing. Do you wish to install them?",
    installDevToolsRequest: "Cannot find SFMC DevTools in your system. Do you want to install it?",
    installDevTools: "Installing SFMC DevTools...",
    installDevToolsSuccess: "SFMC DevTools has been successfully installed!"
};

async function noPrerequisitesHandler(context : ExtensionContext){
    let response = await window.showInformationMessage(MESSAGES['noPreRequisites'], ...["Yes", "No"]);
    if(response && response.toLowerCase() === "yes"){
        const panel = window.createWebviewPanel(
            'prerequisitesPanel',
            'Prequisites Installation',
            ViewColumn.One,
            { // Enable scripts in the webview
                enableScripts: true, //Set this to true if you want to enable Javascript. 
            }
        );

        const filePath = Uri.file(path.join(context.extensionPath, 'src', 'html', 'mcdev_prerequisites.html'));
        let html = fs.readFileSync(filePath.fsPath, 'utf8').toString();

        const stylePathOnDisk = Uri.file(path.join(context.extensionPath, 'dist/design-system/styles/salesforce-lightning-design-system.css'));
        const styleUri = panel.webview.asWebviewUri(stylePathOnDisk);
        html = html.replace("{{styleUri}}", styleUri.toString());

        const jsPathOnDisk = Uri.file(path.join(context.extensionPath, 'src', 'js', 'mcdev_prerequisites.js'));
        const jsUri = panel.webview.asWebviewUri(jsPathOnDisk);
        html = html.replace("{{jsUri}}", jsUri.toString());
        
        panel.webview.onDidReceiveMessage(async message => {
            if(message.command === "install"){
                panel.dispose();
                await installDevTools(context);
            }
        });
        panel.webview.html = html;
    }
}

async function noDevToolsHandler(context: ExtensionContext){
    let response = await window.showInformationMessage(MESSAGES['installDevToolsRequest'], ...["Yes", "No"]);
    if(response && response.toLowerCase() === "yes"){
        await installDevTools(context);
    }
}

async function installDevTools(context: ExtensionContext){
    await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
        progress.report({ message: MESSAGES['installDevTools']});
        await execInTerminal(`npm install -g mcdev`);
        const hasDevTools: boolean = await isDevToolsInstalled();
        if(hasDevTools){
            window.showInformationMessage(MESSAGES['installDevToolsSuccess']);
            initHelper(context);
        }else{
            noDevToolsHandler(context);
        }
    });
}

export {
    noPrerequisitesHandler,
    noDevToolsHandler
};