function removeDuplicates(array: (string | number)[]): (string | number)[] {
	return [...new Set(array)];
}

function existsValueInArrObjects(
	array: { [key: string]: string | number }[],
	key: string,
	value: string | number
): boolean {
	return (
		array.filter((object: { [key: string]: string | number }) => object[key] !== undefined && object[key] === value)
			.length > 0
	);
}

function extractValueInArrObjects(array: any[], key: string): (string | number)[] {
	return array.map((object: any) => object[key]).filter(Boolean);
}

function removeSubPathsByParent(paths: string[]): string[] {
	paths.sort((pathA: string, pathB: string) => pathA.localeCompare(pathB));

	const selectedParentPaths: Set<string> = new Set<string>();

	const removePaths = (currentPath: string) => {
		const isChild: boolean = [...selectedParentPaths].some((parentPath: string) =>
			currentPath.startsWith(`${parentPath}`)
		);
		if (isChild) return false;

		selectedParentPaths.add(currentPath);
		return true;
	};

	return paths.filter(removePaths);
}

function removeLeadingDrivePath(path: string): string {
	return path.replace(/^\/[a-zA-Z]:/i, "");
}

export { removeDuplicates, existsValueInArrObjects, extractValueInArrObjects, removeSubPathsByParent, removeLeadingDrivePath };
