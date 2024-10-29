function removeDuplicates(array: (string | number)[]): (string | number)[] {
	return [...new Set(array)];
}

function executeAfterDelay(callback: () => void, delay: number) {
	setTimeout(callback, delay);
}

function existsValueInArrObjects(
	array: { [key: string]: string | number }[],
	key: string,
	value: string | number
): boolean {
	return array.filter(object => object[key] !== undefined && object[key] === value).length > 0;
}

function extractValueInArrObjects<T extends { [key: string]: string | number | undefined }>(
	array: T[],
	key: keyof T
): (string | number)[] {
	return array.map(object => object[key]).filter(value => value !== undefined) as (string | number)[];
}

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

function removeLeadingDrivePath(path: string): string {
	return path.replace(/^\/[a-zA-Z]:/i, "");
}

function getCurrentTime() {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}

export {
	removeDuplicates,
	existsValueInArrObjects,
	extractValueInArrObjects,
	removeSubPathsByParent,
	removeLeadingDrivePath,
	executeAfterDelay,
	getCurrentTime
};
