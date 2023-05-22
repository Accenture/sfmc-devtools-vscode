/* eslint-disable @typescript-eslint/naming-convention */
export enum NoPrerequisitesResponseOptions {
    "Yes" = 1,
    "No" = 0
};
export const prerequisitesConfig: {
    packages: { node: string, git: string },
    titles: { 
        onePrerequisiteMissing: string, 
        multiplePrerequisitesMissing: string,
        askPrerequisitesToUser: string
    },
    webview: { id: string, title: string, filename: string }
} = {
    packages: {
        node: "node -v",
        git: "git --version"
    },
    titles: {
        onePrerequisiteMissing: "Unfortunately the prerequesite {{prerequisites}} is missing.",
        multiplePrerequisitesMissing: "Unfortunately the prerequesites {{prerequisites}} are missing.",
        askPrerequisitesToUser: "Do you want to open the installation guide?"
    },
    webview: {
        id: "prerequisitesPanel",
        title: "Prequisites Installation",
        filename: "devtoolsPrerequisites"
    }
};