import { VSCode } from "@types";
import { SQL_DE_REGEX, SQL_FROM_JOIN_PREFIX_REGEX, SUPPORTED_SQL_FILE_REGEX } from "./dataExtensionLinkProvider";
import { DATA_VIEWS } from "./sqlDiagnosticProvider";

/**
 * Hover provider for known SFMC SQL system data views.
 *
 * Shows contextual hover text (e.g. for _Sent / ENT._Sent) without
 * creating diagnostics, so these hints do not appear in the Problems
 * list or counter.
 */
class SqlDataViewHoverProvider implements VSCode.HoverProvider {
	provideHover(document: VSCode.TextDocument, position: VSCode.Position): VSCode.Hover | undefined {
		const filePath = document.uri.path;

		// Only process .sql files inside retrieve/<cred>/<bu>/query/
		if (!filePath.endsWith(".sql") || !SUPPORTED_SQL_FILE_REGEX.test(filePath)) {
			return undefined;
		}

		const text = document.getText();
		const regex = new RegExp(SQL_DE_REGEX.source, "gi");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const hasEntPrefix = match[1] !== undefined;
			// Group 2: bracketed name; Group 3: bare identifier
			const name = match[2] ?? match[3];
			if (!name) continue;

			const lowerName = name.toLowerCase();
			const dataViewDescription = DATA_VIEWS.get(lowerName);
			if (!dataViewDescription) continue;

			const fromJoinLen = match[0].match(SQL_FROM_JOIN_PREFIX_REGEX)?.[0].length ?? 0;
			const linkStart = match.index + fromJoinLen;
			const linkEnd = match.index + match[0].length;
			const range = new VSCode.Range(document.positionAt(linkStart), document.positionAt(linkEnd));

			if (!range.contains(position)) continue;

			const level = hasEntPrefix ? "At Enterprise level" : "At child BU level";
			return new VSCode.Hover(`System Data View: ${dataViewDescription} ${level}.`, range);
		}

		return undefined;
	}
}

export default SqlDataViewHoverProvider;
