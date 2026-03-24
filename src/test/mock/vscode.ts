/**
 * Minimal mock of the "vscode" module.
 *
 * This file is mapped via tsconfig.test.json path aliases so that unit tests
 * can import source files that depend on the vscode API without requiring a
 * live VS Code host.  Only the surface area actually exercised by unit tests
 * (regex constants, pure helpers, etc.) needs to be present.
 */

enum DiagnosticSeverity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3
}

class Uri {
	readonly scheme: string;
	readonly authority: string;
	readonly path: string;
	readonly query: string;
	readonly fragment: string;

	private constructor(scheme: string, authority: string, path: string, query: string, fragment: string) {
		this.scheme = scheme;
		this.authority = authority;
		this.path = path;
		this.query = query;
		this.fragment = fragment;
	}

	static parse(value: string): Uri {
		const url = new URL(value);
		return new Uri(
			url.protocol.replace(/:$/, ""),
			url.hostname,
			url.pathname,
			url.search.replace(/^\?/, ""),
			url.hash.replace(/^#/, "")
		);
	}

	static file(path: string): Uri {
		return new Uri("file", "", path, "", "");
	}

	toString(): string {
		const q = this.query ? "?" + this.query : "";
		const f = this.fragment ? "#" + this.fragment : "";
		return `${this.scheme}://${this.authority}${this.path}${q}${f}`;
	}
}

class Position {
	readonly line: number;
	readonly character: number;

	constructor(line: number, character: number) {
		this.line = line;
		this.character = character;
	}
}

class Range {
	readonly start: Position;
	readonly end: Position;

	constructor(startOrLine: Position | number, endOrChar: Position | number, endLine?: number, endChar?: number) {
		if (startOrLine instanceof Position && endOrChar instanceof Position) {
			this.start = startOrLine;
			this.end = endOrChar;
		} else {
			this.start = new Position(startOrLine as number, endOrChar as number);
			this.end = new Position(endLine ?? 0, endChar ?? 0);
		}
	}

	contains(positionOrRange: Position | Range): boolean {
		const pos = positionOrRange instanceof Position ? positionOrRange : positionOrRange.start;
		if (pos.line < this.start.line || pos.line > this.end.line) return false;
		if (pos.line === this.start.line && pos.character < this.start.character) return false;
		if (pos.line === this.end.line && pos.character > this.end.character) return false;
		return true;
	}
}

class Selection extends Range {
	readonly anchor: Position;
	readonly active: Position;

	constructor(anchor: Position, active: Position) {
		super(anchor, active);
		this.anchor = anchor;
		this.active = active;
	}
}

class DocumentLink {
	range: Range;
	target?: Uri;

	constructor(range: Range, target?: Uri) {
		this.range = range;
		this.target = target;
	}
}

class Diagnostic {
	range: Range;
	message: string;
	severity: DiagnosticSeverity;
	source?: string;
	code?: string | number | { value: string | number; target: Uri };

	constructor(range: Range, message: string, severity: DiagnosticSeverity = DiagnosticSeverity.Error) {
		this.range = range;
		this.message = message;
		this.severity = severity;
	}
}

class Hover {
	contents: string;
	range?: Range;

	constructor(contents: string, range?: Range) {
		this.contents = contents;
		this.range = range;
	}
}

class CodeAction {
	title: string;
	kind?: CodeActionKind;
	diagnostics?: Diagnostic[];
	isPreferred?: boolean;
	command?: { title: string; command: string; arguments?: unknown[] };

	constructor(title: string, kind?: CodeActionKind) {
		this.title = title;
		this.kind = kind;
	}
}

class CodeActionKind {
	static readonly QuickFix = new CodeActionKind("quickfix");

	readonly value: string;
	private constructor(value: string) {
		this.value = value;
	}
}

class DiagnosticCollection {
	private readonly entries = new Map<string, Diagnostic[]>();

	set(uri: Uri, diagnostics: Diagnostic[]): void {
		this.entries.set(uri.toString(), diagnostics);
	}

	delete(uri: Uri): void {
		this.entries.delete(uri.toString());
	}

	get(uri: Uri): Diagnostic[] | undefined {
		return this.entries.get(uri.toString());
	}

	clear(): void {
		this.entries.clear();
	}

	dispose(): void {
		this.clear();
	}
}

class MarkdownString {
	value: string;
	isTrusted?: boolean;
	supportThemeIcons?: boolean;

	constructor(value = "", supportThemeIcons = false) {
		this.value = value;
		this.supportThemeIcons = supportThemeIcons;
	}

	appendMarkdown(value: string): MarkdownString {
		this.value += value;
		return this;
	}

	appendText(value: string): MarkdownString {
		this.value += value;
		return this;
	}
}

const languages = {
	createDiagnosticCollection: (): DiagnosticCollection => new DiagnosticCollection()
};

const workspace = {
	findFiles: async (): Promise<Uri[]> => [],
	textDocuments: [] as TextDocument[],
	fs: {
		readFile: async (): Promise<Uint8Array> => new Uint8Array()
	},
	getConfiguration: (): Record<string, unknown> & { get: (key: string, defaultValue?: unknown) => unknown } => ({
		get: (_key: string, defaultValue?: unknown) => defaultValue
	})
};

const commands = {
	registerCommand: (): { dispose: () => void } => ({
		dispose: () => {}
	}),
	executeCommand: async <T>(): Promise<T | undefined> => undefined
};

interface TextDocument {
	uri: Uri;
	getText(): string;
	positionAt(offset: number): Position;
	languageId: string;
	fileName: string;
}

interface TextEditor {
	document: TextDocument;
}

interface CodeActionContext {
	diagnostics: Diagnostic[];
}

const window = {
	activeTextEditor: undefined as TextEditor | undefined,
	showInformationMessage: async (): Promise<string | undefined> => undefined,
	showWarningMessage: async (): Promise<string | undefined> => undefined,
	showErrorMessage: async (): Promise<string | undefined> => undefined,
	createOutputChannel: () => ({
		appendLine: () => {},
		show: () => {},
		dispose: () => {}
	})
};

export {
	Uri,
	Position,
	Range,
	Selection,
	DocumentLink,
	Diagnostic,
	DiagnosticSeverity,
	Hover,
	CodeAction,
	CodeActionKind,
	DiagnosticCollection,
	MarkdownString,
	languages,
	workspace,
	commands,
	window
};

export type { TextDocument, TextEditor, CodeActionContext };
