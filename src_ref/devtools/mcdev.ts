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

	execute(action: string, files: string[]) {
		console.log("== Mcdev: Execute ==");
		console.log(action);
		console.log(files);
	}
}

export default Mcdev;
