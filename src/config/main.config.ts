export const mainConfig: {
    credentialsFilename: string,
    requiredFiles: string[],
    allPlaceholder: string,
    messages: {
        selectedCredentialsBU: string,
        selectCredential: string, 
        selectBusinessUnit: string,
        selectCommandType: string,
        selectCommand: string,
        initDevTools: string,
        initiatingDevTools: string,
        runningCommand: string,
        successRunningCommand: string,
        failureRunningCommand: string
    }
} = {
    credentialsFilename: ".mcdevrc.json",
    requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
    allPlaceholder: "*All*",
    messages: {
        selectedCredentialsBU: "Please select a Credential/BU before running the command",
        selectCredential: "Select all or one of the credentials below...",
        selectBusinessUnit: "Select all or one of the business units below...",
        selectCommandType: "Select one DevTools command type...",
        selectCommand: "Select one DevTools Command...",
        initDevTools: "Do you wish to initialize SFMC DevTools project in the current directory?",
        initiatingDevTools: "Initiating SFMC DevTools project...",
        runningCommand: "Running DevTools Command...",
        successRunningCommand: "DevTools Command has run successfully.",
        failureRunningCommand: "Oh no. Something went wrong while running DevTools Command."
    }
};