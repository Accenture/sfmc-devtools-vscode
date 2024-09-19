import { IDevTools } from "@types";

abstract class Commands {
	protected static packageName: string;
	abstract commandsList(): string[];
	abstract run(name: string, parameters: IDevTools.ICommandParameters[]): void;

	static setPackageName(name: string): void {
		Commands.packageName = name;
	}

	protected static getPackageName(): string {
		return Commands.packageName;
	}

	protected configureParameters({ credential, metadata, optional }: IDevTools.ICommandParameters): string {
		console.log("== Commands: configureParameters ==");
		const defaultParameter: string = "--skipInteraction";
		const buildMetadataParameter = ({ metadatatype, key }: IDevTools.MetadataCommand): string =>
			`-m ${metadatatype}${key && ":" + key}`;
		const buildOptionalParameter = (optionalParam: string) => `${optionalParam && "--" + optionalParam}`;
		if (!credential) throw new Error("");
		const metadataParameters: string = metadata
			.map((mdt: IDevTools.MetadataCommand) => buildMetadataParameter(mdt))
			.join(" ");
		const optionalParameters: string = (optional || [])
			.map((param: string) => buildOptionalParameter(param))
			.join(" ");
		return `${credential} ${metadataParameters} ${optionalParameters} ${defaultParameter}`;
	}

	protected execute() {}
}
export default Commands;
