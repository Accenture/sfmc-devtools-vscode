import { VSCode } from "@types";
import { Lib } from "utils";

interface CommandRegister {
	command: string;
	callbackAction: (files: string[]) => void;
}

/**
 * VSCode Commands class
 *
 * @class VSCodeCommands
 * @typedef {VSCodeCommands}
 */
class VSCodeCommands {
	/**
	 * VSCode commands instance
	 *
	 * @private
	 * @type {typeof VSCode.commands}
	 */
	private commands: typeof VSCode.commands = VSCode.commands;

	/**
	 * Registers all the commands in VSCode
	 *
	 * @param {(CommandRegister | CommandRegister[])} register command register
	 */
	registerCommand(register: CommandRegister | CommandRegister[]): void {
		[register].flat().forEach(registry =>
			this.commands.registerCommand(
				registry.command,
				(clickedUri?: VSCode.Uri, allSelectedUris?: VSCode.Uri[]) => {
					// VS Code passes the right-clicked item as the first argument.
					// When multiple items are selected (Ctrl+Click) in the explorer or the
					// editor tab bar, VS Code also passes all selected URIs as the second argument.
					// We merge both to cover cases where clickedUri may not be included in
					// allSelectedUris, then deduplicate.
					const uris = [...(allSelectedUris ?? []), ...(clickedUri ? [clickedUri] : [])];
					const filePaths = uris.map(uri => uri.path).filter((path): path is string => path !== undefined);
					registry.callbackAction(Lib.removeDuplicates(filePaths) as string[]);
				}
			)
		);
	}

	/**
	 * Executes VSCode Commands
	 *
	 * @param {(string | string[])} command - command name
	 * @param {(string | boolean | string[])[]} args - command arguments
	 */
	executeCommand(command: string | string[], args: (string | boolean | string[])[]): void {
		[command].flat().forEach(async command => await this.commands.executeCommand(command, ...args));
	}

	/**
	 * Sets VSCode extension context
	 *
	 * @param {(string | string[])} command - command name
	 * @param {(string | boolean | string[])[]} args - command arguments
	 */
	executeCommandContext(command: string | string[], args: (string | boolean | string[])[]): void {
		[command].flat().forEach(command => this.commands.executeCommand("setContext", command, ...args));
	}

	/**
	 * Installs an extension
	 *
	 * @param {(string | string[])} extensionName - extension name
	 */
	installExtension(extensionName: string | string[]): void {
		this.executeCommand(["extension.open", "workbench.extensions.installExtension"], [extensionName].flat());
	}

	/**
	 * Reloads the workspace
	 *
	 */
	reloadWorkspace(): void {
		this.executeCommand("workbench.action.reloadWindow", []);
	}
}

export default VSCodeCommands;
