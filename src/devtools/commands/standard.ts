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
	run(name: keyof typeof StandardCommandsAlias, parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
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
	retrieve(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Retrieve ==");

		if ("files" in parameters) {
			// command alias
			const retrieveAlias = StandardCommandsAlias.retrieve;

			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];
			// command parameters configuration
			const retrieveConfig = fileParameters.map(parameter => [
				this.configureParameters(parameter),
				parameter.projectPath
			]);
			return { alias: retrieveAlias, config: retrieveConfig };
		}
		throw new Error(`[standard_retrieve]: The property 'files' is missing from parameters.`);
	}

	/**
	 * Standard Command 'deploy' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	deploy(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Deploy ==");

		if ("files" in parameters) {
			// command alias
			const deployAlias = StandardCommandsAlias.deploy;

			let fileParameters = parameters.files as TDevTools.ICommandFileParameters[];

			// Checks if the deploy action is from the retrieve folder
			fileParameters = fileParameters
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
				.filter(param => param !== undefined) as TDevTools.ICommandFileParameters[];

			// command parameters configuration
			const deployConfig = fileParameters.map(parameter => [
				this.configureParameters(parameter),
				parameter.projectPath
			]);

			return { alias: deployAlias, config: deployConfig };
		}
		throw new Error(`[standard_deploy]: The property 'files' is missing from parameters.`);
	}

	/**
	 * Standard Command 'delete' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	delete(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Delete ==");

		if ("files" in parameters) {
			// command alias
			const deleteAlias = StandardCommandsAlias.delete;

			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];

			// command parameters configuration
			const deleteConfig = fileParameters.map(parameter => [
				this.configureParameters(parameter),
				parameter.projectPath
			]);

			return { alias: deleteAlias, config: deleteConfig };
		}
		throw new Error(`[standard_delete]: The property 'files' is missing from parameters.`);
	}
}

export default StandardCommands;
