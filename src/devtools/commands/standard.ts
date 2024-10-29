import Commands from "./commands";
import { TDevTools } from "@types";

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
		}
		return config;
	}

	retrieve(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Retrieve ==");
		const retrieveAlias = StandardCommandsAlias.retrieve;
		const retrieveConfig = parameters.map(parameter => [
			this.configureParameters(parameter),
			parameter.projectPath
		]);
		return { alias: retrieveAlias, config: retrieveConfig };
	}

	deploy(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== StandardCommands: Deploy ==");
		const deployAlias = StandardCommandsAlias.deploy;

		// Checks if the deploy action is from the retrieve folder
		parameters = parameters
			.map(parameter => {
				const isFromRetrieveFolder = parameter.topFolder === "/retrieve/";
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
			.filter(param => param !== undefined) as TDevTools.ICommandParameters[];

		const deployConfig = parameters.map(parameter => [this.configureParameters(parameter), parameter.projectPath]);

		return { alias: deployAlias, config: deployConfig };
	}
}

export default StandardCommands;
