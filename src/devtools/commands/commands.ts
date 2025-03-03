import { TDevTools } from "@types";

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
		const defaultParameter = "--skipInteraction --noLogColors";

		const buildMetadataParameter = ({ metadatatype, key }: TDevTools.IMetadataCommand) =>
			`-m ${metadatatype}${key && ":" + '"' + key + '"'}`;

		const buildOptionalParameter = (optionalParam: string) => `${optionalParam && "--" + optionalParam}`;

		// Builds the metadata part of the command
		const metadataParameters: string = metadata.map(mdt => buildMetadataParameter(mdt)).join(" ");

		// Build the optional parameters part of the command
		const optionalParameters: string = (optional || []).map(param => buildOptionalParameter(param)).join(" ");

		// command configured
		return `${credential} ${metadataParameters} ${optionalParameters} ${defaultParameter}`;
	}
}
export default Commands;
