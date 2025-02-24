import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Templating Commands Alias
 *
 * @enum {number}
 */
enum TemplatingCommandsAlias {
	build = "build"
}

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
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "build":
				config = this.build(parameters);
				break;
		}
		return config;
	}

	/**
	 * Templating Command 'build' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	build(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== TemplatingCommands: Retrieve ==");
		console.log(parameters);
		// command alias
		const buildAlias = TemplatingCommandsAlias.build;

		// command parameters configuration
		const buildConfig = [[]];
		return { alias: buildAlias, config: buildConfig };
	}
}

export default TemplatingCommands;
