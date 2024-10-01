import { IDevTools } from "@types";
import { terminal } from "../utils/terminal";
import MetadataTypes from "./metadatatypes";
import StandardCommands from "./commands/standard";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";
import { removeSubPathsByParent } from "../utils/lib";

class Mcdev {
	private packageName: string = "mcdev";
	private metadataTypes: MetadataTypes;
	private commandsTypes: Commands[] = [new AdminCommands(), new StandardCommands()];
	// private credentials: { [key: string]: IDevTools.ICredentials };

	constructor() {
		this.metadataTypes = new MetadataTypes();
		// this.credentials = this.loadCredentials();
		Commands.setPackageName(this.packageName);
	}

	public getPackageName(): string {
		return this.packageName;
	}

	public isInstalled(): boolean {
		try {
			// Checks if mcdev package is installed
			return terminal.isPackageInstalled(this.packageName);
		} catch (error) {
			// log error
			return false;
		}
	}

	public install() {
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

	public convertPathsToFiles(paths: string[]): IDevTools.IFileFormat[] {
		console.log("== Mcdev: Convert File Paths ==");

		const convertToFileFormat = (path: string): IDevTools.IFileFormat => {
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
		return paths.map(convertToFileFormat);
	}

	private getCommandBySubCommandName(name: string): Commands {
		console.log("== Mcdev: Get Command By Sub Command name ==");
		const [mcdevCommand]: Commands[] = Object.values(this.commandsTypes).filter((mcdevCommand: Commands) =>
			mcdevCommand.commandsList().includes(name)
		);
		if (mcdevCommand) return mcdevCommand;
		else throw new Error(""); // log error
	}

	private mapToCommandParameters(files: IDevTools.IFileFormat[]): IDevTools.ICommandParameters[] {
		type MetadataByCredential = { [projectPath: string]: { [credential: string]: IDevTools.IMetadataCommand[] } };
		// Appends all selected metadata files mapped by credential name
		const metadataByCredential = files.reduce((mdtByCred: MetadataByCredential, file: IDevTools.IFileFormat) => {
			const { projectPath }: IDevTools.IFileFormat = file;
			const credential: string = this.getCredentialByFileLevel(file);
			const metadata: IDevTools.IMetadataCommand | undefined = this.getMetadataByFileLevel(file);

			mdtByCred[projectPath] = mdtByCred[projectPath] || {};
			mdtByCred[projectPath][credential] = mdtByCred[projectPath][credential] || [];

			if (metadata) mdtByCred[projectPath][credential].push(metadata);
			return mdtByCred;
		}, {} as MetadataByCredential);

		// Maps to the Command Parameters format
		return Object.entries(metadataByCredential).flatMap(([projectPath, credentials]) =>
			Object.entries(credentials).map(([credential, metadata]) => ({ credential, metadata, projectPath }))
		);
	}

	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: IDevTools.IFileFormat): string {
		switch (level) {
			case "top_folder":
				return "*";
			case "cred_folder":
				return `${credentialsName}/*`;
			default:
				return `${credentialsName}/${businessUnit}`;
		}
	}

	private getMetadataByFileLevel({
		level,
		path,
		metadataType,
		filename
	}: IDevTools.IFileFormat): IDevTools.IMetadataCommand | undefined {
		switch (level) {
			case "mdt_folder":
				return { metadatatype: metadataType as string, key: "", path };
			case "file":
				return { metadatatype: metadataType as string, key: filename as string, path };
			default:
				return undefined;
		}
	}

	public execute(command: string, filePaths: string[]) {
		console.log("== Mcdev: Execute ==");
		// Gets the MCDEV command class based on the selected command
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);

		// Filters the paths by parent folder to avoid repeating calling MCDEV commands
		const filteredPathsByParent: string[] = removeSubPathsByParent(filePaths);

		// Convert paths to file structure following MCDEV command requirements
		const selectedFiles: IDevTools.IFileFormat[] = this.convertPathsToFiles(filteredPathsByParent);

		// Convert files to MCDEV Command Parameters
		const commandParameters: IDevTools.ICommandParameters[] = this.mapToCommandParameters(selectedFiles);

		// Calls the mcdev command to run with the right parameters
		if (mcdevCommand) mcdevCommand.run(command, commandParameters);
	}
}

export default Mcdev;
