import { ExtensionContext } from "vscode";

type EditorContext = { set: (context: ExtensionContext) => void, get: () => ExtensionContext };

let contextInstance: ExtensionContext;
const editorContext: EditorContext = {
    set: (context: ExtensionContext) => contextInstance = context,
    get: () => contextInstance 
};
export { ExtensionContext, editorContext };