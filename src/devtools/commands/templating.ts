import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Templating Commands Alias
 *
 * @enum {number}
 */
enum TemplatingCommandsAlias {}

/**
 * Templating Commands class
 *
 * @class TemplatingCommands
 * @typedef {TemplatingCommands}
 * @extends {Commands}
 */
class TemplatingCommands extends Commands {
	/**
	 * List of commands for the Templating Commands class
	 *
	 * @returns {string[]} templating commands list
	 */
	commandsList(): string[] {
		console.log("== TemplatingCommands: commandsList ==");
		return Object.keys(TemplatingCommandsAlias);
	}

	/**
	 * Runs a command
	 *
	 * @param {keyof typeof TemplatingCommandsAlias} name - admin command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(
		name: keyof typeof TemplatingCommandsAlias,
		parameters: TDevTools.ICommandParameters
	): TDevTools.ICommandConfig {
		console.log("== TemplatingCommands: Run ==");
		console.log(name, parameters);
		return { alias: "", config: [] };
	}
}

export default TemplatingCommands;
