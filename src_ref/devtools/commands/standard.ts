/* eslint-disable @typescript-eslint/no-unused-vars */
import { IDevTools } from "@types";
import Commands from "./commands";
import { terminal } from "../../utils/terminal";

class StandardCommands extends Commands {
	commandsList(): string[] {
		console.log("== StandardCommands: commandsList ==");
		return ["retrieve", "deploy"];
	}

	run(name: string, parameters: IDevTools.ICommandParameters[]): void {
		console.log("== StandardCommands: Run ==");
		switch (name) {
			case "retrieve":
				this.retrieve(parameters);
				break;
			case "deploy":
				this.deploy(parameters);
				break;
			default:
				throw new Error(""); // log error
		}
	}

	retrieve(parameters: IDevTools.ICommandParameters[]) {
		console.log("== StandardCommands: Retrieve ==");
		const retrieveCommand: string = `${Commands.getPackageName()} retrieve`;
		const parametersList: string[] = parameters.map((parameter: IDevTools.ICommandParameters) =>
			this.configureParameters(parameter)
		);
		const retrieveCommandList: string[] = parametersList.map(
			(parameters: string) => `${retrieveCommand} ${parameters}`
		);
	}

	deploy(parameters: IDevTools.ICommandParameters[]) {
		console.log("== StandardCommands: Deploy ==");
		const deployCommand: string = `${Commands.getPackageName()} deploy`;
	}
}

export default StandardCommands;
