const vscode = acquireVsCodeApi();

function installDevtools(){
    vscode.postMessage({ command: "install"});
}
