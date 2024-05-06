import { terminal } from "../utils/terminal";

class Mcdev {
	packageName: string = "mcdev";
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
			terminal.installPackage(this.packageName);
		} catch (error) {
			// log error
		}
	}
}

export default Mcdev;
