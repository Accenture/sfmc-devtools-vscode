import { VSCode } from "@types";
import { removeDuplicates } from "../utils/lib";

interface CommandRegister {
	command: string;
	callbackAction: (files: string[]) => void;
}

class VSCodeCommands {
	private commands: typeof VSCode.commands = VSCode.commands;

	registerCommand(register: CommandRegister | CommandRegister[]) {
		[register].flat().forEach(registry =>
			this.commands.registerCommand(registry.command, (...files: VSCode.Uri[]) => {
				const filePaths = files
					.flat()
					.map(file => file.path)
					.filter(path => path !== undefined);
				registry.callbackAction(removeDuplicates(filePaths) as string[]);
			})
		);
	}

	executeCommand(command: string | string[], args: (string | boolean | string[])[]) {
		[command].flat().forEach(async command => await this.commands.executeCommand(command, ...args));
	}

	executeCommandContext(command: string | string[], args: (string | boolean | string[])[]) {
		[command].flat().forEach(command => this.commands.executeCommand("setContext", command, ...args));
	}

	installExtension(extensionName: string | string[]) {
		this.executeCommand(["extension.open", "workbench.extensions.installExtension"], [extensionName].flat());
	}

	reloadWorkspace() {
		this.executeCommand("workbench.action.reloadWindow", []);
	}
}

export default VSCodeCommands;
