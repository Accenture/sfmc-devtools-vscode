import * as fs from "fs";

/**
 * Checks if a file exists
 *
 * @param {(string | string[])} path - file path
 * @returns {string[]} all the file path that exist
 */
function fileExists(path: string | string[]): string[] {
	try {
		return [path].flat().filter(path => fs.existsSync(path.replace(/^\/[a-zA-Z]:/g, "")));
	} catch (error) {
		throw error;
	}
}

/**
 * Extracts the file name from a file path
 *
 * @param {(string | string[])} files - file paths
 * @returns {string[]} list of extracted file names
 */
function extractFileName(files: string | string[]): string[] {
	return [files].flat().map(file => {
		const endOfFileNameIndex = file.lastIndexOf(".", file.lastIndexOf(".") - 1);
		if (endOfFileNameIndex < 0) return file;
		return file.substring(0, endOfFileNameIndex);
	});
}

export { fileExists, extractFileName };
