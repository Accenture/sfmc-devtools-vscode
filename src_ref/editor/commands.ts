import { commands } from "vscode";

class VSCodeCommands {
	executeCommand(command: string | string[], args: (string | boolean | string[])[]) {
		[command].flat().forEach(async (command: string) => await commands.executeCommand(command, ...args));
	}

	installExtension(extensionName: string | string[]) {
		this.executeCommand(["extension.open", "workbench.extensions.installExtension"], [extensionName].flat());
	}

	reloadWorkspace() {
		this.executeCommand("workbench.action.reloadWindow", []);
	}
}

export default VSCodeCommands;
