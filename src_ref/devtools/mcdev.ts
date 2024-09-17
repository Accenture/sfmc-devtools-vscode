import { IDevTools } from "@types";
import { terminal } from "../utils/terminal";
import MetadataTypes from "./metadatatypes";
import StandardCommands from "./commands/standard";
import Commands from "./commands/commands";
import AdminCommands from "./commands/admin";
import { extractValueInArrObjects } from "../utils/lib";

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

	private organizeFilesByFileLevel(files: IDevTools.IFileFormat[]) {
		return files.reduce((fileLevelMap: IDevTools.FileLevelMap, file: IDevTools.IFileFormat) => {
			if (!(file.level in fileLevelMap)) fileLevelMap[file.level] = [file];
			else fileLevelMap[file.level].push(file);
			return fileLevelMap;
		}, {} as IDevTools.FileLevelMap);
	}

	private removeUnneededFiles(files: IDevTools.IFileFormat[]): IDevTools.IFileFormat[] {
		type SelectedFoldersFilter = Partial<{ [key in keyof IDevTools.IFileFormat]: string[] }>;
		const { cred_folder, bu_folder, mdt_folder, file }: IDevTools.FileLevelMap =
			this.organizeFilesByFileLevel(files);

		const extractFolderByFileField = (
			folder: IDevTools.IFileFormat[] | undefined,
			field: keyof IDevTools.IFileFormat
		) => (folder ? extractValueInArrObjects(folder, field) : []) as string[];

		const filterFilesBySelectedFolders = (
			folder: IDevTools.IFileFormat[] | undefined,
			filter: SelectedFoldersFilter
		) =>
			folder
				? folder.filter((file: IDevTools.IFileFormat) =>
						Object.entries(filter).every(([field, selectedFolder]) => {
							const fileFieldValue = file[field as keyof IDevTools.IFileFormat] as string | undefined;
							return fileFieldValue && !selectedFolder.includes(fileFieldValue);
						})
					)
				: [];

		const selectedCredentialsFolders: string[] = extractFolderByFileField(cred_folder, "credentialsName");
		const selectedBusinessUnitsFolders: string[] = extractFolderByFileField(bu_folder, "businessUnit");
		const selectedMetadataTypesFolders: string[] = extractFolderByFileField(mdt_folder, "metadataType");

		return [
			...(cred_folder || []),
			...filterFilesBySelectedFolders(bu_folder, { credentialsName: selectedCredentialsFolders }),
			...filterFilesBySelectedFolders(mdt_folder, {
				credentialsName: selectedCredentialsFolders,
				businessUnit: selectedBusinessUnitsFolders
			}),
			...filterFilesBySelectedFolders(file, {
				credentialsName: selectedCredentialsFolders,
				businessUnit: selectedBusinessUnitsFolders,
				metadataType: selectedMetadataTypesFolders
			})
		];
	}

	private mapToCommandParameters(files: IDevTools.IFileFormat[]) {
		type MetadataByCredential = { [key: string]: IDevTools.MetadataCommand[] };
		// Appends all selected metadata files mapped by credential name
		const metadataByCredential = files.reduce((mdtByCred: MetadataByCredential, file: IDevTools.IFileFormat) => {
			const credential: string = this.getCredentialByFileLevel(file);
			const metadata: IDevTools.MetadataCommand | undefined = this.getMetadataByFileLevel(file);
			if (metadata) {
				mdtByCred[credential] = mdtByCred[credential] || [];
				mdtByCred[credential].push(metadata);
			}
			return mdtByCred;
		}, {} as MetadataByCredential);
		// Maps to the Command Parameters format
		return Object.entries(metadataByCredential).map(([credential, metadata]) => ({
			credential,
			metadata
		}));
	}

	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: IDevTools.IFileFormat): string {
		if (level === "top_folder") return "*";
		else if (level === "cred_folder") return `${credentialsName}/*`;
		else return `${credentialsName}/${businessUnit}`;
	}

	private getMetadataByFileLevel({
		level,
		metadataType,
		filename
	}: IDevTools.IFileFormat): IDevTools.MetadataCommand | undefined {
		if (level === "mdt_folder") return { metadatatype: metadataType as string, key: "" };
		else if (level === "file") return { metadatatype: metadataType as string, key: filename as string };
		else return;
	}

	execute(command: string, files: IDevTools.IFileFormat[]) {
		console.log("== Mcdev: Execute ==");
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);
		const cleanFileList: IDevTools.IFileFormat[] = this.removeUnneededFiles(files);
		const commandParameters: IDevTools.ICommandParameters[] = this.mapToCommandParameters(cleanFileList);
		if (mcdevCommand) mcdevCommand.run(command, commandParameters);
	}
}

export default Mcdev;
