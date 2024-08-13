import Commands from ".";

class StandardCommands extends Commands {
	commandsList(): string[] {
		return ["retrieve", "deploy"];
	}
}

export default StandardCommands;
