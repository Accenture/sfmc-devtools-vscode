import { window, WebviewPanel, Uri, ViewColumn } from "vscode";
import { editorWorkspace } from "./workspace";
import { log } from "./output";
import { lib } from "../shared/utils/lib";

interface WebviewConfig {
    id: string,
    title: string,
    extensionPath: string,
    filename: string,
    handler: (data: any) => { dispose: boolean }
};

async function create(config: WebviewConfig){
    try {
        const panel: WebviewPanel = window.createWebviewPanel(
            config.id,
            config.title,
            ViewColumn.One,
            { enableScripts: true }
        );

        let html: string = await editorWorkspace.readFile(lib.createFilePath([
            config.extensionPath,
            "src",
            "html",
            `${config.filename}.html`
        ]));

        const sldsPath: string = lib.createFilePath([
            config.extensionPath,
            "src",
            "css",
            "salesforce-lightning-design-system.min.css"
        ]);

        const jsPath: string = lib.createFilePath([
            config.extensionPath,
            "src",
            "js",
            `${config.filename}.js`
        ]);

        const sldsUriPath: Uri = panel.webview.asWebviewUri(Uri.file(sldsPath));
        const jsUriPath: Uri = panel.webview.asWebviewUri(Uri.file(jsPath));

        html = html.replace("{{styleUri}}", sldsUriPath.toString());
        html = html.replace("{{jsUri}}", jsUriPath.toString());

        panel.webview.onDidReceiveMessage((data: any) => {
            const { dispose }: { dispose: boolean } = config.handler(data);
            if(dispose){
                panel.dispose();
            }
        });
        panel.webview.html = html;
    }catch(error){
        log("error", error);
    }
}

export const editorWebview = {
    create
};