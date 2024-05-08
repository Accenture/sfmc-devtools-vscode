import { IDevTools } from "@types";

export const devToolsConfig: IDevTools.IConfig = {
	extensionName: "sfmc-devtools-vscode",
	requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
	recommendedExtensions: ["IBM.output-colorizer"]
};
