/**
 * Removes duplicate values from a string/number array
 *
 * @param {(string | number)[]} array - array of string/numbers
 * @returns {(string | number)[]} array of string/number without repetitions
 */
function removeDuplicates(array: (string | number)[]): (string | number)[] {
	return [...new Set(array)];
}

/**
 * Executes a function after some time
 *
 * @param {() => void} callback - action method
 * @param {number} delay - time in ms
 * @returns {void}
 */
function executeAfterDelay(callback: () => void, delay: number): void {
	setTimeout(callback, delay);
}

/**
 * Removes paths if their parent folder path already exists
 *
 * @param {string[]} paths
 * @returns {string[]} array of paths without sub paths
 */
function removeSubPathsByParent(paths: string[]): string[] {
	paths.sort((pathA, pathB) => pathA.localeCompare(pathB));

	const selectedParentPaths = new Set<string>();

	const removePaths = (currentPath: string) => {
		const isChild = [...selectedParentPaths].some(parentPath => currentPath.startsWith(`${parentPath}`));
		if (isChild) return false;

		selectedParentPaths.add(currentPath);
		return true;
	};

	return paths.filter(removePaths);
}

/**
 * Removes the leading root drive from a path
 *
 * @param {string} path - path
 * @returns {string} - path with the leading root drive removed
 */
function removeLeadingRootDrivePath(path: string): string {
	return path.replace(/^\/[a-zA-Z]:/i, "");
}

/**
 * Gets the current timestamp in format hh:mm:ss
 *
 * @returns {string} - timestamp hh:mm:ss
 */
function getCurrentTime(): string {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}

export { removeDuplicates, removeSubPathsByParent, removeLeadingRootDrivePath, executeAfterDelay, getCurrentTime };
