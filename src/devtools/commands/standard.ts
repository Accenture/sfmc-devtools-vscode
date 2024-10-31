import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Standard Commands Alias
 *
 * @enum {number}
 */
enum StandardCommandsAlias {
	retrieve = "r",
	deploy = "d",
	delete = "del"
}

/**
 * Standard Commands class
 *
 * @class StandardCommands
 * @typedef {StandardCommands}
 * @extends {Commands}
 */
class StandardCommands extends Commands {
	/**
	 * List of commands for the Standard Commands class
	 *
	 * @returns {string[]} standard commands list
	 */
	commandsList(): string[] {
		console.log("== StandardCommands: commandsList ==");
		return Object.keys(StandardCommandsAlias);
	}

	/**
	 * Runs a command
	 *
	 * @param {keyof typeof StandardCommandsAlias} name - admin command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(
		name: keyof typeof StandardCommandsAlias,
		parameters: TDevTools.ICommandParameters[]
	): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Run ==");
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "retrieve":
				config = this.retrieve(parameters);
				break;
			case "deploy":
				config = this.deploy(parameters);
				break;
			case "delete":
				config = this.delete(parameters);
				break;
		}
		return config;
	}

	/**
	 * Standard Command 'retrieve' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	retrieve(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Retrieve ==");
		// command alias
		const retrieveAlias = StandardCommandsAlias.retrieve;

		// command parameters configuration
		const retrieveConfig = parameters.map(parameter => [
			this.configureParameters(parameter),
			parameter.projectPath
		]);
		return { alias: retrieveAlias, config: retrieveConfig };
	}

	/**
	 * Standard Command 'deploy' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	deploy(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Deploy ==");
		// command alias
		const deployAlias = StandardCommandsAlias.deploy;

		// Checks if the deploy action is from the retrieve folder
		parameters = parameters
			.map(parameter => {
				// Checks if the deploy action was triggered from the Retrieve folder
				const isFromRetrieveFolder = parameter.topFolder === "/retrieve/";
				if (isFromRetrieveFolder) {
					// Removes all the multi selected folder that cannot be deployed from retrieve folder
					parameter.metadata = parameter.metadata.filter(
						({ key }: TDevTools.IMetadataCommand) => key && key !== ""
					);
					parameter.optional = ["fromRetrieve"];
				}
				if (isFromRetrieveFolder && !parameter.metadata.length) return undefined;
				return parameter;
			})
			.filter(param => param !== undefined) as TDevTools.ICommandParameters[];

		// command parameters configuration
		const deployConfig = parameters.map(parameter => [this.configureParameters(parameter), parameter.projectPath]);

		return { alias: deployAlias, config: deployConfig };
	}

	delete(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Delete ==");
		// command alias
		const deleteAlias = StandardCommandsAlias.delete;

		// command parameters configuration
		const deleteConfig = parameters.map(parameter => [this.configureParameters(parameter), parameter.projectPath]);

		return { alias: deleteAlias, config: deleteConfig };
	}
}

export default StandardCommands;
