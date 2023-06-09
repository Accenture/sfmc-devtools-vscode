export const mainConfig: {
    credentialsFilename: string,
    requiredFiles: string[],
    allPlaceholder: string,
    messages: { selectCredential: string }
} = {
    credentialsFilename: ".mcdevrc.json",
    requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
    allPlaceholder: "*All*",
    messages: {
        selectCredential: "Select on of the credentials below..."
    }
};