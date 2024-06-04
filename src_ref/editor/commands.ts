import { Uri, commands } from "vscode";
import { removeDuplicates } from "../utils/lib";

interface CommandRegister {
	command: string;
	callbackAction: (files: string[]) => void;
}

class VSCodeCommands {
	registerCommand(register: CommandRegister | CommandRegister[]) {
		[register].flat().forEach(registry =>
			commands.registerCommand(registry.command, (...files: Uri[]) => {
				const filePaths: string[] = files.flat().map((file: Uri) => file.path);
				registry.callbackAction(removeDuplicates(filePaths) as string[]);
			})
		);
	}

	executeCommand(command: string | string[], args: (string | boolean | string[])[]) {
		[command].flat().forEach(async (command: string) => await commands.executeCommand(command, ...args));
	}

	executeCommandContext(command: string | string[], args: (string | boolean | string[])[]) {
		[command].flat().forEach((command: string) => commands.executeCommand("setContext", command, ...args));
	}

	installExtension(extensionName: string | string[]) {
		this.executeCommand(["extension.open", "workbench.extensions.installExtension"], [extensionName].flat());
	}

	reloadWorkspace() {
		this.executeCommand("workbench.action.reloadWindow", []);
	}
}

export default VSCodeCommands;
