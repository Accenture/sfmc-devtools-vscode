/* eslint-disable @typescript-eslint/naming-convention */

enum ViewColumn {
  One = 1
}

const StatusBarAlignment = {};

const window = {
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn()
  })),
  showInformationMessage: jest.fn((_: string, ...items: string[]) => {
    return items[0];
  }),
  createWebviewPanel: jest.fn(() => {
    return {
      webview: {
        html: "",
        asWebviewUri: ((uri: any) => uri),
        onDidReceiveMessage: () => {}
      },
      dispose: () => {}
    };
  })
};

const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: [],
  onDidSaveTextDocument: jest.fn()
};

const Uri = {
  file: (f: any) => f,
  parse: jest.fn()
};

const commands = {
  executeCommand: jest.fn()
};

export {
  StatusBarAlignment,
  window,
  workspace,
  Uri,
  commands,
  ViewColumn
};