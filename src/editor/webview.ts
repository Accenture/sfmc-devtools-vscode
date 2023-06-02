import { window, WebviewPanel, Uri, ViewColumn } from "vscode";
import { file } from "../shared/utils/file";

interface WebviewConfig {
    id: string,
    title: string,
    extensionPath: string,
    filename: string,
    handler: (data: any) => { dispose: boolean }
};

function create(config: WebviewConfig){
    try {
        const panel: WebviewPanel = window.createWebviewPanel(
            config.id,
            config.title,
            ViewColumn.One,
            { enableScripts: true }
        );

        let html: string = file.readFileSync(file.createFilePath([
            config.extensionPath,
            "src",
            "html",
            `${config.filename}.html`
        ]));

        const sldsPath: string = file.createFilePath([
            config.extensionPath,
            "src",
            "css",
            "salesforce-lightning-design-system.min.css"
        ]);

        const jsPath: string = file.createFilePath([
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
        console.error(error); // TODO
    }
}

export const editorWebview = {
    create
};