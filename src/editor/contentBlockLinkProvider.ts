import { VSCode } from "@types";

/**
 * Pattern matching ContentBlockByKey() calls with single or double quotes,
 * optional surrounding whitespace, and optional escaped quotes.
 *
 * Matches:
 *   ContentBlockByKey("key")
 *   ContentBlockByKey( "key" )
 *   ContentBlockByKey('key')
 *   ContentBlockByKey( 'key' )
 *   ContentBlockByKey(\"key\")
 */
const CONTENT_BLOCK_REGEX = /ContentBlockByKey\(\s*\\?["']([^"'\\]+)\\?["']\s*\)/g;

/**
 * Matches file paths that belong to the retrieve or deploy top-level folders.
 * Uses forward slashes since VSCode URIs are always POSIX-style.
 */
const SUPPORTED_FOLDER_REGEX = /\/(?:retrieve|deploy)\//;

/**
 * Document link provider for ContentBlockByKey references.
 * Turns ContentBlockByKey("key") calls into clickable links that open
 * the corresponding SFMC asset file in the workspace.
 *
 * Only active for files inside the retrieve/ or deploy/ folders.
 * Markdown (.md) and SQL (.sql) files are excluded.
 *
 * @class ContentBlockLinkProvider
 * @implements {VSCode.DocumentLinkProvider}
 */
class ContentBlockLinkProvider implements VSCode.DocumentLinkProvider {
	/**
	 * Provides document links for all ContentBlockByKey references in a document.
	 * Searches the workspace for matching asset files under asset/other/ and asset/block/.
	 *
	 * Returns an empty array when the document is not inside a retrieve/ or deploy/
	 * folder, or when the file has a .md or .sql extension.
	 *
	 * @async
	 * @param {VSCode.TextDocument} document - The document being scanned
	 * @returns {Promise<VSCode.DocumentLink[]>} Array of document links pointing to found asset files
	 */
	async provideDocumentLinks(document: VSCode.TextDocument): Promise<VSCode.DocumentLink[]> {
		const filePath = document.uri.path;

		// Skip files outside retrieve/ and deploy/ folders, and skip .md and .sql files
		if (!SUPPORTED_FOLDER_REGEX.test(filePath) || filePath.endsWith(".md") || filePath.endsWith(".sql")) return [];

		const text = document.getText();
		const matches: { key: string; range: VSCode.Range }[] = [];
		let match: RegExpExecArray | null;
		const regex = new RegExp(CONTENT_BLOCK_REGEX.source, "g");

		while ((match = regex.exec(text)) !== null) {
			const key = match[1];
			// Calculate the position of the key within the full match string
			const keyOffset = match.index + match[0].indexOf(key);
			const range = new VSCode.Range(document.positionAt(keyOffset), document.positionAt(keyOffset + key.length));
			matches.push({ key, range });
		}

		if (!matches.length) return [];

		// Collect unique keys and search for their asset files in parallel
		const uniqueKeys = [...new Set(matches.map(m => m.key))];
		const fileSearchResults = await Promise.all(
			uniqueKeys.map(key => VSCode.workspace.findFiles(`**/asset/{other,block}/${key}.asset-*-meta.*`))
		);

		// Map each key to the URI of its first matching asset file
		const keyToUri = new Map<string, VSCode.Uri>();
		uniqueKeys.forEach((key, index) => {
			if (fileSearchResults[index].length > 0) {
				keyToUri.set(key, fileSearchResults[index][0]);
			}
		});

		// Return a DocumentLink only for keys whose asset file was found
		return matches
			.filter(m => keyToUri.has(m.key))
			.map(m => new VSCode.DocumentLink(m.range, keyToUri.get(m.key)!));
	}
}

export default ContentBlockLinkProvider;
