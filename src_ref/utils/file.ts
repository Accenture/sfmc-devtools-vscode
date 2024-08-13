import * as fs from "fs";

function fileExists(path: string | string[]): string[] {
	try {
		return [path].flat().filter((path: string) => fs.existsSync(path.replace(/^\/[a-zA-Z]:/g, "")));
	} catch (error) {
		throw error;
	}
}

function extractFileName(files: string | string[]): string[] {
	return [files].flat().map((file: string) => {
		const endOfFileNameIndex: number = file.lastIndexOf(".", file.lastIndexOf(".") - 1);
		if (endOfFileNameIndex < 0) return file;
		return file.substring(0, endOfFileNameIndex);
	});
}

export { fileExists, extractFileName };
