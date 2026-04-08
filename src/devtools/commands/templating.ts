import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Enum representing the alias for templating commands.
 *
 * @enum {string}
 */
enum TemplatingCommandsAlias {
	clone = "clone",
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
		return Object.keys(TemplatingCommandsAlias);
	}

	/**
	 * Runs a command
	 *
	 * @param {string} name - templating command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(name: string, parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "clone":
				config = this.clone(parameters);
				break;
			case "build":
				config = this.build(parameters);
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
		const buFromFlag = this.retrieveAlias("buFrom");
		const buTargetFlag = this.retrieveAlias("buTarget");

		// Check if the parameters object contains the 'files' and 'targetBusinessUnit' properties
		if ("files" in parameters && "targetBusinessUnit" in parameters) {
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
		throw new Error(`[templating_clone]: The property 'files' is missing from parameters.`);
	}

	build(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		if (
			"files" in parameters &&
			"buFrom" in parameters &&
			"marketFrom" in parameters &&
			"buTo" in parameters &&
			"marketTo" in parameters
		) {
			const alias = TemplatingCommandsAlias.build;
			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];
			const buFromFlag = this.retrieveAlias("buFrom");
			const buTargetFlag = this.retrieveAlias("buTarget");
			const optional: string[] = [];
			if ("dependencies" in parameters && parameters.dependencies) optional.push("--dependencies");
			if ("retrieve" in parameters && parameters.retrieve) optional.push("--retrieve");
			if ("skipValidation" in parameters && parameters.skipValidation)
				optional.push(this.retrieveFlag("skipValidation"));
			if (parameters.purge === true) optional.push(this.retrieveFlag("purge"));
			else optional.push(this.retrieveFlag("noPurge"));
			const buFromVal = parameters.buFrom as string;
			const buToVal = parameters.buTo as string;
			const marketFromVal = parameters.marketFrom as string;
			const marketToVal = parameters.marketTo as string;
			const config = fileParameters.map(p => {
				const credential = `${buFromFlag} ${buFromVal} ${buTargetFlag} ${buToVal} --marketFrom ${marketFromVal} --marketTo ${marketToVal}`;
				return [
					this.configureParameters({ ...p, credential, optional: [...(p.optional || []), ...optional] }),
					p.projectPath
				];
			});
			return { alias, config };
		}
		throw new Error(
			`[templating_build]: Required properties (files, buFrom, marketFrom, buTo, marketTo) are missing from parameters.`
		);
	}
}

export default TemplatingCommands;
