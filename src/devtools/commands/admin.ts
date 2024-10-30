import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Admin Commands Alias
 *
 * @enum {number}
 */
enum AdminCommandsAlias {
	explainTypes = "et"
}

/**
 * Admin Commands class
 *
 * @class AdminCommands
 * @typedef {AdminCommands}
 * @extends {Commands}
 */
class AdminCommands extends Commands {
	/**
	 * List of commands for the Admin Commands class
	 *
	 * @returns {string[]} admin commands list
	 */
	commandsList(): string[] {
		console.log("== AdminCommands: commandsList ==");
		return Object.keys(AdminCommandsAlias);
	}

	/**
	 * Runs a command
	 *
	 * @param {keyof typeof AdminCommandsAlias} name - admin command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(name: keyof typeof AdminCommandsAlias, parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== AdminCommands: Run ==");
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "explainTypes":
				config = this.explainTypes(parameters);
		}
		return config;
	}

	/**
	 * Admin Command 'explainTypes' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	explainTypes(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== AdminCommands: Explain Types ==");
		// command alias
		const explainTypesAlias = AdminCommandsAlias.explainTypes;
		// command parameters configuration
		const explainTypesConfig = parameters.map(({ projectPath }) => {
			const commandParameters: TDevTools.ICommandParameters = {
				credential: "",
				metadata: [],
				projectPath,
				topFolder: "",
				optional: ["json"]
			};
			return [this.configureParameters(commandParameters), projectPath];
		});
		return { alias: explainTypesAlias, config: explainTypesConfig };
	}
}

export default AdminCommands;
