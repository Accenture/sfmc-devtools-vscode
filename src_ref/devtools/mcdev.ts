import { IDevTools } from "@types";
import { terminal } from "../utils/terminal";
import MetadataTypes from "./metadatatypes";
import StandardCommands from "./commands/standard";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";

const mcdevCommands: { [key: string]: Commands } = {
	admin: new AdminCommands(),
	standard: new StandardCommands()
};

class Mcdev {
	private packageName: string = "mcdev";
	private metadataTypes: MetadataTypes;
	// private credentials: { [key: string]: IDevTools.ICredentials };

	constructor() {
		this.metadataTypes = new MetadataTypes();
		// this.credentials = this.loadCredentials();
		Commands.setPackageName(this.packageName);
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

	getCommandBySubCommandName(name: string): Commands {
		console.log("== Mcdev: Get Command By Sub Command name ==");

		const commandsTypes: string[] = Object.keys(mcdevCommands);
		const [commandTypeName]: string[] = commandsTypes.filter((typeName: string) =>
			mcdevCommands[typeName].commandsList().includes(name)
		);
		if (commandTypeName) return mcdevCommands[commandTypeName];
		else throw new Error(""); // log error
	}

	private getAllFilesCredentials(files: IDevTools.IFileFormat[]): string[] {
		return [...new Set<string>(files.map((file: IDevTools.IFileFormat) => this.getCredentialByFileLevel(file)))];
	}

	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: IDevTools.IFileFormat): string {
		if (level === "top_folder") return "*";
		else if (level === "cred_folder") return `${credentialsName}/*`;
		else return `${credentialsName}/${businessUnit}`;
	}

	private getMetadataByFileLevel({ level, metadataType, filename }: IDevTools.IFileFormat):
		| {
				metadatatype: string;
				key: string;
		  }
		| undefined {
		if (level === "bu_folder") return { metadatatype: "", key: "" };
		else if (level === "mdt_folder") return { metadatatype: metadataType as string, key: "" };
		else if (level === "file") return { metadatatype: metadataType as string, key: filename as string };
		else return;
	}

	execute(command: string, files: IDevTools.IFileFormat[]) {
		console.log("== Mcdev: Execute ==");
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);
		const credentialsList: string[] = this.getAllFilesCredentials(files);
		if (mcdevCommand) mcdevCommand.run(command);
	}
}

export default Mcdev;
