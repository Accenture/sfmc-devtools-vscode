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
}
export default Commands;
