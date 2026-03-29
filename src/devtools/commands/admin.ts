import Commands from "./commands";
import { TDevTools } from "@types";

/**
 * Admin Commands Alias
 *
 * @enum {number}
 */
enum AdminCommandsAlias {
	explainTypes = "et",
	createDeltaPkg = "cdp",
	fixKeys = "fx",
	init = "init",
	join = "join",
	reloadBUs = "rb",
	upgrade = "up"
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
		return Object.keys(AdminCommandsAlias);
	}

	/**
	 * Runs a command
	 *
	 * @param {string} name - admin command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	run(name: string, parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "explainTypes":
				config = this.explainTypes(parameters);
				break;
			case "createDeltaPkg":
				config = this.createDeltaPkg(parameters);
				break;
			case "fixKeys":
				config = this.fixKeys(parameters);
				break;
			case "init":
				config = this.init(parameters);
				break;
			case "join":
				config = this.join(parameters);
				break;
			case "reloadBUs":
				config = this.reloadBUs(parameters);
				break;
			case "upgrade":
				config = this.upgrade(parameters);
				break;
		}
		return config;
	}

	/**
	 * Admin Command 'explainTypes' execution
	 *
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} command configuration
	 */
	explainTypes(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		if ("projectPath" in parameters) {
			// command alias
			const explainTypesAlias = AdminCommandsAlias.explainTypes;

			const projectPath = parameters.projectPath as string;

			// command parameters configuration
			const explainTypesConfig = [[this.retrieveFlag("json"), projectPath]];
			return { alias: explainTypesAlias, config: explainTypesConfig };
		}
		throw new Error(`[admin_explainTypes]: The property 'projectPath' is missing from parameters.`);
	}

	createDeltaPkg(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		if ("range" in parameters) {
			const alias = AdminCommandsAlias.createDeltaPkg;
			const range = parameters.range as string;
			const projectPath = (parameters.projectPath as string) || "";
			const optional: string[] = [this.retrieveFlag("skipInteraction"), this.retrieveFlag("noLogColors")];
			if ("filter" in parameters) optional.push(`--filter ${parameters.filter}`);
			const config = [[`${range} ${optional.join(" ")}`, projectPath]];
			return { alias, config };
		}
		throw new Error(`[admin_createDeltaPkg]: The property 'range' is missing from parameters.`);
	}

	fixKeys(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		if ("files" in parameters) {
			const alias = AdminCommandsAlias.fixKeys;
			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];
			const optional: string[] = [];
			if ("executeFlag" in parameters && parameters.executeFlag) optional.push(this.retrieveFlag("executeFlag"));
			if ("schedule" in parameters && parameters.schedule) optional.push(this.retrieveFlag("schedule"));
			const config = fileParameters.map(p => [
				this.configureParameters({ ...p, optional: [...(p.optional || []), ...optional] }),
				p.projectPath
			]);
			return { alias, config };
		}
		throw new Error(`[admin_fixKeys]: The property 'files' is missing from parameters.`);
	}

	init(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		const alias = AdminCommandsAlias.init;
		const projectPath = (parameters.projectPath as string) || "";
		return { alias, config: [["", projectPath]], interactive: true } as TDevTools.ICommandConfig;
	}

	join(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		const alias = AdminCommandsAlias.join;
		const projectPath = (parameters.projectPath as string) || "";
		return { alias, config: [["", projectPath]], interactive: true } as TDevTools.ICommandConfig;
	}

	reloadBUs(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		if ("files" in parameters) {
			const alias = AdminCommandsAlias.reloadBUs;
			const fileParameters = parameters.files as TDevTools.ICommandFileParameters[];
			const config = fileParameters.map(p => [this.configureParameters(p), p.projectPath]);
			return { alias, config };
		}
		if ("projectPath" in parameters) {
			const alias = AdminCommandsAlias.reloadBUs;
			return {
				alias,
				config: [
					[
						this.retrieveFlag("skipInteraction") + " " + this.retrieveFlag("noLogColors"),
						parameters.projectPath as string
					]
				]
			};
		}
		throw new Error(`[admin_reloadBUs]: Either 'files' or 'projectPath' is required.`);
	}

	upgrade(parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig {
		const alias = AdminCommandsAlias.upgrade;
		const projectPath = (parameters.projectPath as string) || "";
		return {
			alias,
			config: [[this.retrieveFlag("skipInteraction") + " " + this.retrieveFlag("noLogColors"), projectPath]]
		};
	}
}

export default AdminCommands;
