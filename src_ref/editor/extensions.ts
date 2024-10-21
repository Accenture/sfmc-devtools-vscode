import { VSCode } from "@types";

class VSCodeExtensions {
	private extensions: typeof VSCode.extensions = VSCode.extensions;
	isExtensionInstalled(extensionName: string): boolean {
		return this.extensions.getExtension(extensionName) !== undefined;
	}
}

export default VSCodeExtensions;
