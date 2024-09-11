/* eslint-disable @typescript-eslint/no-unused-vars */
import Commands from "./commands";

class StandardCommands extends Commands {
	commandsList(): string[] {
		console.log("== StandardCommands: commandsList ==");
		return ["retrieve", "deploy"];
	}

	run(name: string): void {
		console.log("== StandardCommands: Run ==");
		switch (name) {
			case "retrieve":
				this.retrieve();
				break;
			case "deploy":
				this.deploy();
				break;
			default:
				throw new Error(""); // log error
		}
	}

	retrieve() {
		console.log("== StandardCommands: Retrieve ==");
		const retrieveCommand: string = `${Commands.getPackageName()} retrieve`;
	}
	deploy() {
		console.log("== StandardCommands: Deploy ==");
		const deployCommand: string = `${Commands.getPackageName()} deploy`;
	}
}

export default StandardCommands;
