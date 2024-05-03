import { terminal } from "../utils/terminal";

class Mcdev {
	isInstalled() {
		// Checks if mcdev package is installed
		const mcdevInstalled: boolean = terminal.isPackageInstalled("mcdev");
		console.log(mcdevInstalled);
	}
}

export default Mcdev;
