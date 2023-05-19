/* eslint-disable @typescript-eslint/naming-convention */
export enum NoPrerequisitesResponseOptions {
    "Yes" = 1,
    "No" = 0
};
export const prerequisitesConfig: {[key: string]: {[key: string]: string}} = {
    packages: {
        node: "node -v",
        git: "git --version"
    },
    titles: {
        onePrerequisiteMissing: "Unfortunately the prerequesite {{prerequisites}} is missing.",
        multiplePrerequisitesMissing: "Unfortunately the prerequesites {{prerequisites}} are missing."
    }
};