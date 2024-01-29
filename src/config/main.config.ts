export const mainConfig: {
    credentialsFilename: string,
    requiredFiles: string[],
    fileExtensions: string[],
    allPlaceholder: string,
    extensionsDependencies: string[],
    messages: {
        selectedCredentialsBU: string,
        selectCredential: string, 
        selectBusinessUnit: string,
        selectCommandType: string,
        selectCommand: string,
        initDevTools: string,
        initiatingDevTools: string,
        copyToBUInput: string,
        runningCommand: string,
        successRunningCommand: string,
        failureRunningCommand: string,
    }
} = {
    credentialsFilename: ".mcdevrc.json",
    requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
    fileExtensions: ["meta.json", "meta.sql", "meta.html", "meta.ssjs", "doc.md"],
    allPlaceholder: "*All*",
    extensionsDependencies: ["IBM.output-colorizer"],
    messages: {
        selectedCredentialsBU: "Select a Credential/BU before running the command",
        selectCredential: "Select one of the credentials below...",
        selectBusinessUnit: "Select all or one of the business units below...",
        selectCommandType: "Select one DevTools command type...",
        selectCommand: "Select one DevTools Command...",
        initDevTools: "Do you wish to initialize SFMC DevTools project in the current directory?",
        initiatingDevTools: "Initiating SFMC DevTools project...",
        copyToBUInput: "Please choose one of the actions below:",
        runningCommand: "Running DevTools Command...",
        successRunningCommand: "DevTools Command has run successfully.",
        failureRunningCommand: "Oh no. Something went wrong while running DevTools Command. Please check the error by clicking on the mcdev button in the status bar."
    }
};