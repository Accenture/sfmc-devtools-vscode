/* eslint-disable @typescript-eslint/naming-convention */
export enum InstallDevToolsResponseOptions {
    "Yes" = 1,
    "No" = 0
}

export const installerConfig: {
    package: { mcdev: { version: string, install: string } },
    messages: {
        noDevToolsInstalled: string,
        askUserToInstallDevTools: string
    }
} = {
    package: { 
        mcdev: { version: "mcdev --version", install: "npm install -g mcdev" }
    },
    messages: {
        noDevToolsInstalled: "SFMC DevTools could not be located on your system.",
        askUserToInstallDevTools: "Would you like to install SFMC DevTools?"
    }
};