import Commands from "./commands";
import { TDevTools } from "@types";
import { MessagesDevTools } from "@messages";

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
		// "changekey" is listed separately because it reuses the deploy ("d") alias at runtime
		// but requires its own build logic (adds --fromRetrieve, --skipValidation and a
		// changeKey flag); adding it as a duplicate enum key is not possible in TypeScript.
		return [...Object.keys(StandardCommandsAlias), "changekey"];
	}

	/**
	 * Runs a command
	 *
	 * @param {string} name - standard command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(name: string, parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
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
			case "changekey":
				config = this.changekey(parameters);
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
						parameter.optional = [this.retrieveFlag("fromRetrieve")];
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

			// Split each parameter set into chunks that fit within the OS command-line
			// length limit, then build the config entries for every chunk.
			const deleteConfig: string[][] = [];
			for (const parameter of fileParameters) {
				const chunks = this.splitParametersByCommandLength(parameter);
				for (const chunk of chunks) {
					deleteConfig.push([this.configureParameters(chunk), chunk.projectPath]);
				}
			}

			// If chunking produced more entries than the original number of file parameters,
			// attach a one-time info message so the caller can notify the user before starting.
			const preRunInfo =
				deleteConfig.length > fileParameters.length
					? MessagesDevTools.mcdevDeleteCommandSplit(deleteConfig.length)
					: undefined;

			return { alias: deleteAlias, config: deleteConfig, preRunInfo };
		}
		throw new Error(`[standard_delete]: The property 'files' is missing from parameters.`);
	}

	/**
	 * Standard Command 'changekey' execution
	 *
	 * @param {TDevTools.ICommandParameters} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	changekey(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		console.log("== StandardCommands: ChangeKey ==");

		if ("files" in parameters) {
			// changekey runs as a deploy command with --fromRetrieve and a changeKey flag
			const deployAlias = StandardCommandsAlias.deploy;

			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];

			// Require exactly one changeKey parameter before proceeding
			const hasChangeKeyField = "changeKeyField" in parameters;
			const hasChangeKeyValue = "changeKeyValue" in parameters;
			if (!hasChangeKeyField && !hasChangeKeyValue) {
				throw new Error(
					`[standard_changekey]: Either 'changeKeyField' or 'changeKeyValue' must be provided in parameters.`
				);
			}

			// Build the flags assigned to ICommandFileParameters.optional:
			// always --fromRetrieve and --skipValidation, plus either --changeKeyField or --changeKeyValue.
			const optionalFlags: string[] = [this.retrieveFlag("fromRetrieve"), this.retrieveFlag("skipValidation")];
			if (hasChangeKeyField) {
				optionalFlags.push(`${this.retrieveFlag("changeKeyField")} "${parameters.changeKeyField}"`);
			} else {
				optionalFlags.push(`${this.retrieveFlag("changeKeyValue")} "${parameters.changeKeyValue}"`);
			}

			// Only include files that have a key (specific files, not folder-level);
			// create new parameter objects to avoid mutating the input array.
			const filteredParameters = fileParameters
				.map(parameter => ({
					...parameter,
					metadata: parameter.metadata.filter(({ key }: TDevTools.IMetadataCommand) => key && key !== ""),
					optional: optionalFlags
				}))
				.filter(param => param.metadata.length > 0);

			// command parameters configuration
			const changeKeyConfig = filteredParameters.map(parameter => [
				this.configureParameters(parameter),
				parameter.projectPath
			]);

			return { alias: deployAlias, config: changeKeyConfig };
		}
		throw new Error(`[standard_changekey]: The property 'files' is missing from parameters.`);
	}
}

export default StandardCommands;
