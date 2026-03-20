import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Enum representing the alias for templating commands.
 *
 * @enum {string}
 */
enum TemplatingCommandsAlias {
	clone = "clone"
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
			case "clone":
				config = this.clone(parameters);
				break;
		}
		return config;
	}

	/**
	 * Templating Command 'clone' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	clone(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== Templating Commands: Clone ==");
		const buFromFlag = this.retrieveAlias("buFrom");
		const buTargetFlag = this.retrieveAlias("buTarget");

		// Validate required properties individually so error messages are accurate
		if (!("files" in parameters)) {
			throw new Error(`[templating_clone]: The property 'files' is missing from parameters.`);
		}
		if (!("targetBusinessUnit" in parameters)) {
			throw new Error(`[templating_clone]: The property 'targetBusinessUnit' is missing from parameters.`);
		}

		// command alias
		const cloneAlias = TemplatingCommandsAlias.clone;

		// file parameters configuration
		const fileParameters = (parameters.files as TDevTools.ICommandFileParameters[]).map(file => {
			const credential = `${buFromFlag} ${file.credential} ${buTargetFlag} ${parameters.targetBusinessUnit}`;
			return {
				...file,
				credential,
				optional: [this.retrieveFlag("noPurge"), this.retrieveFlag("skipValidation")]
			};
		});

		// command parameters configuration
		const cloneConfig = fileParameters.map(parameter => [
			this.configureParameters(parameter),
			parameter.projectPath
		]);
		return { alias: cloneAlias, config: cloneConfig };
	}
}

export default TemplatingCommands;
