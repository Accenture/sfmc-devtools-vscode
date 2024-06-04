import * as fs from "fs";

function fileExists(path: string | string[]): string[] {
	try {
		return [path].flat().filter((path: string) => fs.existsSync(path.replace(/^\/[a-zA-Z]:/g, "")));
	} catch (error) {
		throw error;
	}
}

export { fileExists };
