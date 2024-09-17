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

export { removeDuplicates, existsValueInArrObjects, extractValueInArrObjects };
