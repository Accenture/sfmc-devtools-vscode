/* eslint-disable @typescript-eslint/naming-convention */

const StatusBarAlignment = {};

const window = {
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn()
  })),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createTextEditorDecorationType: jest.fn()
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

export const vscode = {
  StatusBarAlignment,
  window,
  workspace,
  Uri,
  commands
};