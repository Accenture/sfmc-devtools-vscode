import { IDevTools } from "@types";
import { terminal } from "../utils/terminal";
import MetadataTypes from "./metadatatypes";

class Mcdev {
	private packageName: string = "mcdev";
	private metadataTypes: MetadataTypes;

	constructor() {
		this.metadataTypes = new MetadataTypes();
	}

	isInstalled(): boolean {
		try {
			// Checks if mcdev package is installed
			return terminal.isPackageInstalled(this.packageName);
		} catch (error) {
			// log error
			return false;
		}
	}

	install() {
		console.log("== Mcdev: Install ==");
		try {
			const terminalOutcome = terminal.installPackage(this.packageName);
			if (terminalOutcome.error) {
				// log error
			}
			return { success: terminalOutcome.error.length == 0 };
		} catch (error) {
			// log error
			return { success: false };
		}
	}

	convertFilePaths(paths: string[]) {
		console.log("== Mcdev: Convert File Paths ==");
		const convertMcdevFormat: (path: string) => IDevTools.FileFormat = (path: string) => {
			const [projectPath, relativeFilePath]: string[] = path.split(/\/retrieve\/|\/deploy\//);
			if (projectPath && !relativeFilePath) return { level: "top_folder", projectPath };

			const [credentialsName, businessUnit, metadataType, ...file]: string[] = relativeFilePath.split("/");
			if (file.length) {
				const name: string = "";
				return { level: "file", projectPath, credentialsName, businessUnit, metadataType, name };
			} else if (metadataType)
				return { level: "mdt_folder", projectPath, credentialsName, businessUnit, metadataType };
			else if (businessUnit) return { level: "bu_folder", projectPath, credentialsName, businessUnit };
			else if (credentialsName) return { level: "cred_folder", projectPath, credentialsName };
			return {} as IDevTools.FileFormat;
		};
		return paths.map((path: string) => convertMcdevFormat(path));
	}
}

export default Mcdev;
