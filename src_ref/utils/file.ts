import * as fs from "fs";

function fileExists(path: string | string[]): string[] {
	try {
		return [path].flat().filter(path => fs.existsSync(path.replace(/^\/[a-zA-Z]:/g, "")));
	} catch (error) {
		throw error;
	}
}

function extractFileName(files: string | string[]): string[] {
	return [files].flat().map(file => {
		const endOfFileNameIndex = file.lastIndexOf(".", file.lastIndexOf(".") - 1);
		if (endOfFileNameIndex < 0) return file;
		return file.substring(0, endOfFileNameIndex);
	});
}

export { fileExists, extractFileName };
