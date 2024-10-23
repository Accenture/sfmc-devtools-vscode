import { TDevTools } from "@types";
import Commands from "./commands";

enum AdminCommandsAlias {
	explainTypes = "et"
}

class AdminCommands extends Commands {
	commandsList(): string[] {
		console.log("== AdminCommands: commandsList ==");
		return Object.keys(AdminCommandsAlias);
	}

	run(name: keyof typeof AdminCommandsAlias, parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== AdminCommands: Run ==");
		let config: TDevTools.ICommandConfig = { alias: "", config: [] };
		switch (name) {
			case "explainTypes":
				config = this.explainTypes(parameters);
		}
		return config;
	}

	explainTypes(parameters: TDevTools.ICommandParameters[]): TDevTools.ICommandConfig {
		console.log("== AdminCommands: Explain Types ==");
		const explainTypesAlias: string = AdminCommandsAlias.explainTypes;
		const explainTypesConfig: string[][] = parameters.map(({ projectPath }: TDevTools.ICommandParameters) => {
			const commandParameters: TDevTools.ICommandParameters = {
				credential: "",
				metadata: [],
				projectPath,
				topFolder: "",
				optional: ["json"]
			};
			return [this.configureParameters(commandParameters), projectPath];
		});
		return { alias: explainTypesAlias, config: explainTypesConfig };
	}
}

export default AdminCommands;
