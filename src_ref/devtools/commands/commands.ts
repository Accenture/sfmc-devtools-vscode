import { TDevTools } from "@types";

abstract class Commands {
	protected static packageName: string;
	abstract commandsList(): string[];
	abstract run(name: string, parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig;

	protected configureParameters({ credential, metadata, optional }: TDevTools.ICommandParameters): string {
		console.log("== Commands: configureParameters ==");
		const defaultParameter: string = "--skipInteraction";
		const buildMetadataParameter = ({ metadatatype, key }: TDevTools.IMetadataCommand): string =>
			`-m ${metadatatype}${key && ":" + '"' + key + '"'}`;
		const buildOptionalParameter = (optionalParam: string) => `${optionalParam && "--" + optionalParam}`;
		if (!credential) throw new Error("");
		const metadataParameters: string = metadata
			.map((mdt: TDevTools.IMetadataCommand) => buildMetadataParameter(mdt))
			.join(" ");
		const optionalParameters: string = (optional || [])
			.map((param: string) => buildOptionalParameter(param))
			.join(" ");
		return `${credential} ${metadataParameters} ${optionalParameters} ${defaultParameter}`;
	}
}
export default Commands;
