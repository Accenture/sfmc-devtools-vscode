import { TDevTools } from "@types";

/**
 * Command Alias
 *
 * @enum {number}
 */
enum CommandAlias {
	buFrom = "--bf",
	buTarget = "--bt",
	metadata = "-m"
}

/**
 * Command Flags
 *
 * @enum {number}
 */
enum CommandFlags {
	skipInteraction = "--y",
	noLogColors = "--noLogColors",
	noPurge = "--no-purge",
	skipValidation = "--skipValidation",
	fromRetrieve = "--fromRetrieve",
	json = "--json",
	changeKeyField = "--changeKeyField",
	changeKeyValue = "--changeKeyValue"
}

/**
 * Command class
 *
 * @abstract
 * @class Commands
 * @typedef {Commands}
 */
abstract class Commands {
	/**
	 * Commands List
	 *
	 * @abstract
	 * @returns {string[]} list of commands
	 */
	abstract commandsList(): string[];
	/**
	 * Runs a command
	 *
	 * @abstract
	 * @param {string} name - command name
	 * @param {TDevTools.ICommandParameters[]} parameters - command parameters
	 * @returns {TDevTools.ICommandConfig} configuration after running a specific command
	 */
	abstract run(name: string, parameters: TDevTools.ICommandParameters): TDevTools.ICommandConfig;

	/**
	 * Retrieves the value of a specified flag from the CommandFlags object.
	 *
	 * @param name - The key of the flag to retrieve. Must be a key of the CommandFlags object.
	 * @returns The value associated with the specified flag.
	 */
	retrieveFlag(name: keyof typeof CommandFlags): string {
		return CommandFlags[name];
	}

	/**
	 * Retrieves the alias for a given command name.
	 *
	 * @param name - The name of the command as a key of the CommandAlias object.
	 * @returns The alias corresponding to the provided command name.
	 */
	retrieveAlias(name: keyof typeof CommandAlias): string {
		return CommandAlias[name];
	}

	/**
	 * Configures the command parameters
	 *
	 * @protected
	 * @param {TDevTools.ICommandParameters} param.credential - command credential name
	 * @param {TDevTools.ICommandParameters} param.metadata - command metadata
	 * @param {TDevTools.ICommandParameters} param.optional - command optional values
	 * @returns {string} command configured
	 */
	protected configureParameters({ credential, metadata, optional }: TDevTools.ICommandFileParameters): string {
		console.log("== Commands: configureParameters ==");
		// All commands executed have the --skipInteraction flag to avoid user interaction with the terminal
		const defaultFlags = `${this.retrieveFlag("skipInteraction")} ${this.retrieveFlag("noLogColors")}`;

		const buildMetadataParameter = ({ metadatatype, key, subKey }: TDevTools.IMetadataCommand) =>
			subKey
				? `${this.retrieveAlias("metadata")} ${metadatatype}:${subKey}:"${key}"`
				: `${this.retrieveAlias("metadata")} ${metadatatype}${key && ":" + '"' + key + '"'}`;

		// Builds the metadata part of the command
		const metadataParameters: string = metadata.map(mdt => buildMetadataParameter(mdt)).join(" ");

		// Build the optional flags part of the command
		const optionalFlags: string = (optional || []).join(" ");

		// command configured
		return `${credential} ${metadataParameters} ${optionalFlags} ${defaultFlags}`;
	}
}
export default Commands;
