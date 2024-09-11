import { IDevTools } from "@types";

abstract class Commands {
	protected static packageName: string;
	abstract commandsList(): string[];
	abstract run(name: string): void;

	static setPackageName(name: string): void {
		Commands.packageName = name;
	}

	protected static getPackageName(): string {
		return Commands.packageName;
	}

	protected configureParameters(parameters: IDevTools.ICommandParameters): string {
		console.log("== Commands: configureParameters ==");
		console.log(parameters);
		// { credential: "", metadata: [{metadatatype: "", key: ""}], optional: ["json", "fromRetrieve"]}
		const defaultParameter: string = "--skipInteraction";
		return `${defaultParameter}`;
	}
}
export default Commands;
