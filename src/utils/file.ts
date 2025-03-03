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

function readFileSync(path: string): string {
	return fs.readFileSync(path, "utf-8");
}

/**
 * Extracts the file name from a file path
 *
 * @param {string} filePath - file path
 * @returns {string} extracted file name
 */
function extractFileNameFromPath(filePath: string): string {
	// splits path
	const fileName = filePath.split(/[\/]/).pop() || filePath;

	// returns folder name
	if (!fileName.includes(".")) return fileName;

	// if it's a file in format filename.asset-asset-meta.ext
	const lastDotIndex = fileName.lastIndexOf(".");
	const secondLastDotIndex = fileName.lastIndexOf(".", fileName.lastIndexOf(".") - 1);
	if (secondLastDotIndex < 0) return filePath.substring(0, lastDotIndex);
	return fileName.substring(0, secondLastDotIndex);
}

export { fileExists, readFileSync, extractFileNameFromPath };
