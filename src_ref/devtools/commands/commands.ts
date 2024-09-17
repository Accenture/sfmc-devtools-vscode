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
		const buildMetadataParams = ({ metadatatype, key }: IDevTools.MetadataCommand): string =>
			`-m ${metadatatype}${key ? ":" + key : ""}`;
		if (!credential) throw new Error("");
		const paramaters: string = `${credential}`;
		// { credential: "", metadata: [{metadatatype: "", key: ""}], optional: ["json", "fromRetrieve"]}
		const defaultParameter: string = "--skipInteraction";
		return `${defaultParameter}`;
	}
}
export default Commands;
