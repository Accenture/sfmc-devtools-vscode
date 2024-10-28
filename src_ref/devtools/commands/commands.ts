import { TDevTools } from "@types";

abstract class Commands {
	protected static packageName: string;
	abstract commandsList(): string[];
	abstract run(name: string, parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig;

	protected configureParameters({ credential, metadata, optional }: TDevTools.ICommandParameters): string {
		console.log("== Commands: configureParameters ==");
		const defaultParameter = "--skipInteraction";
		const buildMetadataParameter = ({ metadatatype, key }: TDevTools.IMetadataCommand) =>
			`-m ${metadatatype}${key && ":" + '"' + key + '"'}`;
		const buildOptionalParameter = (optionalParam: string) => `${optionalParam && "--" + optionalParam}`;
		const metadataParameters: string = metadata.map(mdt => buildMetadataParameter(mdt)).join(" ");
		const optionalParameters: string = (optional || []).map(param => buildOptionalParameter(param)).join(" ");
		return `${credential} ${metadataParameters} ${optionalParameters} ${defaultParameter}`;
	}
}
export default Commands;
