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

	run(name: keyof typeof AdminCommandsAlias): TDevTools.ICommandConfig {
		console.log("== AdminCommands: Run ==");
		throw new Error("Method not implemented.");
	}

	explainTypes() {}
}

export default AdminCommands;
