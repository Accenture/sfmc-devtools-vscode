export const mainConfig: {
    credentialsFilename: string,
    requiredFiles: string[],
    allPlaceholder: string,
    messages: { 
        selectCredential: string, 
        selectBusinessUnit: string,
        selectCommandType: string,
        selectCommand: string
    }
} = {
    credentialsFilename: ".mcdevrc.json",
    requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
    allPlaceholder: "*All*",
    messages: {
        selectCredential: "Select all or one of the credentials below...",
        selectBusinessUnit: "Select all or one of the business units below...",
        selectCommandType: "Select on DevTools command type...",
        selectCommand: "Select one DevToolsCommand "
    }
};