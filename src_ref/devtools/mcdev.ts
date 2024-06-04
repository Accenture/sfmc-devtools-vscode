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
		const convertToMcdevFormat: (path: string) => IDevTools.FileFormat = (path: string) => {
			// Splits file path by 'retrieve' or 'deploy' folder
			const [projectPath, relativeFilePath]: string[] = path.split(/\/retrieve\/|\/deploy\//);

			// If file is the retrieve or deploy folder
			if (projectPath && !relativeFilePath) return { level: "top_folder", projectPath };

			// Else get the folder structure for the file according to mcdev folder structure:
			// Credentials Name -> Business Unit -> MetadataType -> file or folder (Asset/Folders)
			const [credentialsName, businessUnit, metadataType, ...fileParts]: string[] = relativeFilePath.split("/");
			if (fileParts.length) {
				this.metadataTypes.handleFileConfiguration(metadataType, fileParts);
				return { level: "file", projectPath, credentialsName, businessUnit, metadataType };
			}
			if (metadataType) return { level: "mdt_folder", projectPath, credentialsName, businessUnit, metadataType };
			if (businessUnit) return { level: "bu_folder", projectPath, credentialsName, businessUnit };
			if (credentialsName) return { level: "cred_folder", projectPath, credentialsName };
			return {} as IDevTools.FileFormat;
		};
		return paths.map((path: string) => convertToMcdevFormat(path));
	}
}

export default Mcdev;
