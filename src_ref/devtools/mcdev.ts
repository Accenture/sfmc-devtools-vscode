import { TDevTools, TUtils } from "@types";
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

	constructor() {
		this.metadataTypes = new MetadataTypes();
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
			const terminalOutcome: TUtils.ITerminalCommandResult = terminal.installPackage(this.packageName);
			if (!terminalOutcome.success) {
				// log error
			}
			return { success: terminalOutcome.success };
		} catch (error) {
			// log error
			return { success: false };
		}
	}

	public convertPathsToFiles(paths: string[]): TDevTools.IFileFormat[] {
		console.log("== Mcdev: Convert File Paths ==");

		const convertToFileFormat = (path: string): TDevTools.IFileFormat => {
			// Splits file path by 'retrieve' or 'deploy' folder
			const [projectPath, topFolder, relativeFilePath]: string[] = path.split(/(\/retrieve\/|\/deploy\/)/g);

			// Top Folder Configuration Fields
			const topFormat: TDevTools.IFileFormat = { level: "top_folder", projectPath, topFolder, path };

			// If file is the retrieve or deploy folder
			if (projectPath && !relativeFilePath) return topFormat;

			// Else get the folder structure for the file according to mcdev folder structure:
			// Credentials Name -> Business Unit -> MetadataType -> file or folder (Asset/Folders)
			const [credentialsName, businessUnit, metadataType, ...fileParts]: string[] = relativeFilePath.split("/");
			if (fileParts.length) {
				const { filename, mdtType }: { filename?: string; mdtType?: string } =
					this.metadataTypes.handleFileConfiguration(metadataType, fileParts);
				return {
					...topFormat,
					level: "file",
					credentialsName,
					businessUnit,
					metadataType: mdtType || metadataType,
					filename
				};
			}
			if (metadataType) return { ...topFormat, level: "mdt_folder", credentialsName, businessUnit, metadataType };
			if (businessUnit) return { ...topFormat, level: "bu_folder", credentialsName, businessUnit };
			if (credentialsName) return { ...topFormat, level: "cred_folder", credentialsName };
			return {} as TDevTools.IFileFormat;
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

	private mapToCommandParameters(files: TDevTools.IFileFormat[]): TDevTools.ICommandParameters[] {
		type MetadataByCredential = {
			[projectPath: string]: { [topFolder: string]: { [credential: string]: TDevTools.IMetadataCommand[] } };
		};
		// Appends all selected metadata files mapped by credential name
		const metadataByCredential = files.reduce((mdtByCred: MetadataByCredential, file: TDevTools.IFileFormat) => {
			const { projectPath, topFolder }: TDevTools.IFileFormat = file;
			const credential: string = this.getCredentialByFileLevel(file);
			const metadata: TDevTools.IMetadataCommand | undefined = this.getMetadataByFileLevel(file);

			mdtByCred[projectPath] = mdtByCred[projectPath] || {};
			mdtByCred[projectPath][topFolder] = mdtByCred[projectPath][topFolder] || {};
			mdtByCred[projectPath][topFolder][credential] = mdtByCred[projectPath][topFolder][credential] || [];

			if (metadata) mdtByCred[projectPath][topFolder][credential].push(metadata);
			return mdtByCred;
		}, {} as MetadataByCredential);

		// Maps to the Command Parameters format
		return Object.entries(metadataByCredential).flatMap(([projectPath, projectTopFolder]) =>
			Object.entries(projectTopFolder).flatMap(([topFolder, credentials]) =>
				Object.entries(credentials).map(([credential, metadata]) => ({
					credential,
					metadata,
					projectPath,
					topFolder
				}))
			)
		);
	}

	private getCredentialByFileLevel({ level, credentialsName, businessUnit }: TDevTools.IFileFormat): string {
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
	}: TDevTools.IFileFormat): TDevTools.IMetadataCommand | undefined {
		switch (level) {
			case "mdt_folder":
				return { metadatatype: metadataType as string, key: "", path };
			case "file":
				return { metadatatype: metadataType as string, key: filename as string, path };
			default:
				return undefined;
		}
	}

	public async execute(
		command: string,
		commandHandler: (output: string, error: string) => void,
		filePaths: string[]
	) {
		console.log("== Mcdev: Execute ==");
		// Gets the MCDEV command class based on the selected command
		const mcdevCommand: Commands = this.getCommandBySubCommandName(command);

		// Filters the paths by parent folder to avoid repeating calling MCDEV commands
		const filteredPathsByParent: string[] = removeSubPathsByParent(filePaths);

		// Convert paths to file structure following MCDEV command requirements
		const selectedFiles: TDevTools.IFileFormat[] = this.convertPathsToFiles(filteredPathsByParent);

		// Convert files to MCDEV Command Parameters
		const commandParameters: TDevTools.ICommandParameters[] = this.mapToCommandParameters(selectedFiles);

		const commandResults: boolean[] = [];
		// Calls the mcdev command to run with the right parameters
		if (mcdevCommand) {
			const commandConfig: TDevTools.ICommandConfig = mcdevCommand.run(command, commandParameters);
			for (const [parameters, projectPath] of commandConfig.config) {
				const terminalConfig: TUtils.ITerminalCommandRunner = {
					command: this.getPackageName(),
					commandArgs: [commandConfig.alias, parameters],
					commandCwd: projectPath,
					commandHandler: ({ output, error }: TUtils.ITerminalCommandStreams) => commandHandler(output, error)
				};
				const { success }: TUtils.ITerminalCommandResult = await terminal.executeTerminalCommand(
					terminalConfig,
					false
				);
				commandResults.push(success);
			}
		}
		return { success: commandResults.every((result: boolean) => result === true) };
	}
}

export default Mcdev;
