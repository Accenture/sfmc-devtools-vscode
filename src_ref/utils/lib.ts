function removeDuplicates(array: (string | number)[]): (string | number)[] {
	return [...new Set(array)];
}

export { removeDuplicates };
