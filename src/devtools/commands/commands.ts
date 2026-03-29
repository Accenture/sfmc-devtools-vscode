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
	changeKeyValue = "--changeKeyValue",
	likeKey = "--like.key",
	likeName = "--like.name",
	purge = "--purge",
	format = "--format",
	noFormat = "--no-format",
	schedule = "--schedule",
	skipStatusCheck = "--skipStatusCheck",
	executeFlag = "--execute",
	dependencies = "--dependencies",
	retrieve = "--retrieve"
}

/**
 * Maximum safe command-line length (in characters) used to split metadata arguments
 * into multiple command invocations. Windows cmd.exe limits the command line to
 * 8191 characters; this conservative threshold leaves headroom for the executable
 * name, sub-command alias, and shell quoting overhead.
 */
export const MAX_CMD_LENGTH = 8000;

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
	 * Builds the command string for a single metadata item.
	 *
	 * @protected
	 * @param {TDevTools.IMetadataCommand} item - metadata command item
	 * @returns {string} single metadata parameter string
	 */
	protected buildMetadataItem({ metadatatype, key, subKey }: TDevTools.IMetadataCommand): string {
		return subKey
			? `${this.retrieveAlias("metadata")} ${metadatatype}:${subKey}:"${key}"`
			: `${this.retrieveAlias("metadata")} ${metadatatype}${key && ":" + '"' + key + '"'}`;
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
		// All commands executed have the --skipInteraction flag to avoid user interaction with the terminal
		const defaultFlags = `${this.retrieveFlag("skipInteraction")} ${this.retrieveFlag("noLogColors")}`;

		// Builds the metadata part of the command
		const metadataParameters: string = metadata.map(mdt => this.buildMetadataItem(mdt)).join(" ");

		// Build the optional flags part of the command
		const optionalFlags: string = (optional || []).join(" ");

		// command configured
		return `${credential} ${metadataParameters} ${optionalFlags} ${defaultFlags}`;
	}

	/**
	 * Splits an {@link TDevTools.ICommandFileParameters} object into one or more chunks so that
	 * the resulting command-line string for each chunk does not exceed {@link MAX_CMD_LENGTH}
	 * characters. This prevents the "Command line is too long" error on Windows when a large
	 * number of metadata items are selected.
	 *
	 * Each chunk is a copy of the original parameter with a subset of the metadata array.
	 * The base string (credential + optional flags + default flags, with no metadata) is
	 * measured first and metadata items are added greedily until the limit would be exceeded,
	 * at which point a new chunk is started.
	 *
	 * @protected
	 * @param {TDevTools.ICommandFileParameters} parameter - original command file parameters
	 * @returns {TDevTools.ICommandFileParameters[]} one or more parameter objects whose command strings fit within the limit
	 */
	protected splitParametersByCommandLength(
		parameter: TDevTools.ICommandFileParameters
	): TDevTools.ICommandFileParameters[] {
		// Build the base command string (credential + optional flags + defaults, no metadata items)
		// to measure the fixed overhead before any -m arguments are added.
		const baseLength = this.configureParameters({ ...parameter, metadata: [] }).length;

		const chunks: TDevTools.ICommandFileParameters[] = [];
		let currentMetadata: TDevTools.IMetadataCommand[] = [];
		// Start with the base length plus a space separator before the first -m argument
		let currentLength = baseLength;

		for (const item of parameter.metadata) {
			const itemStr = ` ${this.buildMetadataItem(item)}`;
			if (currentMetadata.length > 0 && currentLength + itemStr.length > MAX_CMD_LENGTH) {
				// Current chunk is full — flush it and start a new one
				chunks.push({ ...parameter, metadata: currentMetadata });
				currentMetadata = [];
				currentLength = baseLength;
			}
			currentMetadata.push(item);
			currentLength += itemStr.length;
		}

		if (currentMetadata.length > 0) {
			chunks.push({ ...parameter, metadata: currentMetadata });
		}

		// If no metadata was present, return the original parameter unchanged
		return chunks.length > 0 ? chunks : [parameter];
	}
}
export default Commands;
