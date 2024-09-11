import Commands from "./commands";

class AdminCommands extends Commands {
	commandsList(): string[] {
		console.log("== AdminCommands: commandsList ==");
		return ["explainTypes"];
	}

	run(name: string): void {
		console.log("== AdminCommands: Run ==");
		throw new Error("Method not implemented.");
	}
	explainTypes() {}
}

export default AdminCommands;
