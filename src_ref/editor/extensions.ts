import { extensions } from "vscode";

class VSCodeExtensions {
	isExtensionInstalled(extensionName: string): boolean {
		return extensions.getExtension(extensionName) !== undefined;
	}
}

export default VSCodeExtensions;
