import { IDevTools } from "@types";
import { terminal } from "../utils/terminal";
import MetadataTypes from "./metadatatypes";
import StandardCommands from "./commands/standard";
import Commands from "./commands";

const mcdevCommands: { [key: string]: Commands } = {
	standard: new StandardCommands()
};

class Mcdev {
	private packageName: string = "mcdev";
	private metadataTypes: MetadataTypes;
	private credentials: { [key: string]: IDevTools.ICredentials };

	constructor() {
		this.metadataTypes = new MetadataTypes();
		this.credentials = this.loadCredentials();
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

	convertFilePaths(paths: string[]): IDevTools.IFileFormat[] {
		console.log("== Mcdev: Convert File Paths ==");
		const convertToMcdevFormat: (path: string) => IDevTools.IFileFormat = (path: string) => {
			// Splits file path by 'retrieve' or 'deploy' folder
			const [projectPath, relativeFilePath]: string[] = path.split(/\/retrieve\/|\/deploy\//);

			// If file is the retrieve or deploy folder
			if (projectPath && !relativeFilePath) return { level: "top_folder", projectPath, path };

			// Else get the folder structure for the file according to mcdev folder structure:
			// Credentials Name -> Business Unit -> MetadataType -> file or folder (Asset/Folders)
			const [credentialsName, businessUnit, metadataType, ...fileParts]: string[] = relativeFilePath.split("/");
			if (fileParts.length) {
				const { filename, metadatatype }: { filename?: string; metadatatype?: string } =
					this.metadataTypes.handleFileConfiguration(metadataType, fileParts);
				return {
					level: "file",
					projectPath,
					path,
					credentialsName,
					businessUnit,
					metadataType: metadatatype || metadataType,
					filename
				};
			}
			if (metadataType)
				return { level: "mdt_folder", projectPath, path, credentialsName, businessUnit, metadataType };
			if (businessUnit) return { level: "bu_folder", projectPath, path, credentialsName, businessUnit };
			if (credentialsName) return { level: "cred_folder", projectPath, path, credentialsName };
			return {} as IDevTools.IFileFormat;
		};
		return paths.map((path: string) => convertToMcdevFormat(path));
	}

	loadCredentials() {
		console.log("== Mcdev: Load Credentials ==");
	}

	getCredentialsList() {
		console.log("== Mcdev: Get Credentials List ==");
	}
}

export default Mcdev;
