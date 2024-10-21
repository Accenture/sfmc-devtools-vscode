/* eslint-disable @typescript-eslint/no-unused-vars */
import { TDevTools } from "@types";
import Commands from "./commands";

enum StandardCommandsAlias {
	retrieve = "r",
	deploy = "d"
}

class StandardCommands extends Commands {
	commandsList(): string[] {
		console.log("== StandardCommands: commandsList ==");
		return Object.keys(StandardCommandsAlias);
	}

	run(
		name: keyof typeof StandardCommandsAlias,
		parameters: TDevTools.ICommandParameters[]
	): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Run ==");
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "retrieve":
				config = this.retrieve(parameters);
				break;
			case "deploy":
				config = this.deploy(parameters);
				break;
			default:
				throw new Error(""); // log error
		}
		return config;
	}

	retrieve(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Retrieve ==");
		const retrieveAlias: string = StandardCommandsAlias.retrieve;
		const retrieveConfig: string[][] = parameters.map((parameter: TDevTools.ICommandParameters) => [
			this.configureParameters(parameter),
			parameter.projectPath
		]);
		return { alias: retrieveAlias, config: retrieveConfig };
	}

	deploy(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Deploy ==");
		const deployAlias: string = StandardCommandsAlias.deploy;

		// Checks if the deploy action is from the retrieve folder
		parameters = parameters
			.map((parameter: TDevTools.ICommandParameters) => {
				const isFromRetrieveFolder: boolean = parameter.topFolder === "/retrieve/";
				if (isFromRetrieveFolder) {
					// Removes all the multi selected folder that cannot be deployed from retrieve folder
					parameter.metadata = parameter.metadata.filter(
						({ key }: TDevTools.IMetadataCommand) => key && key !== ""
					);
					parameter.optional = ["fromRetrieve"];
				}
				if (isFromRetrieveFolder && !parameter.metadata.length) return undefined;
				return parameter;
			})
			.filter((param: TDevTools.ICommandParameters | undefined) => param !== undefined);

		const deployConfig: string[][] = parameters.map((parameter: TDevTools.ICommandParameters) => [
			this.configureParameters(parameter),
			parameter.projectPath
		]);

		return { alias: deployAlias, config: deployConfig };
	}
}

export default StandardCommands;
