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

	get fsPath(): string {
		return this.path;
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

class ThemeColor {
	constructor(readonly id: string) {}
}

class ThemeIcon {
	constructor(
		readonly id: string,
		readonly color?: ThemeColor
	) {}
}

class TreeItem {
	label: string;
	collapsibleState?: number;
	contextValue?: string;
	tooltip?: string;
	iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri };

	constructor(label: string, collapsibleState?: number) {
		this.label = label;
		this.collapsibleState = collapsibleState;
	}
}

const TreeItemCollapsibleState = {
	None: 0,
	Collapsed: 1,
	Expanded: 2
} as const;

class RelativePattern {
	constructor(
		readonly base: string | Uri | { uri: Uri },
		readonly pattern: string
	) {}
}

const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64
} as const;

const ConfigurationTarget = {
	Global: 1,
	Workspace: 2,
	WorkspaceFolder: 3
} as const;

const StatusBarAlignment = {
	Left: 1,
	Right: 2
} as const;

const ProgressLocation = {
	SourceControl: 1,
	Window: 10,
	Notification: 15
} as const;

const ViewColumn = {
	Active: -1,
	Beside: -2,
	One: 1
} as const;

class WebviewPanel {}

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
	createDiagnosticCollection: (): DiagnosticCollection => new DiagnosticCollection(),
	registerDocumentLinkProvider: (): { dispose: () => void } => ({ dispose: () => {} }),
	registerHoverProvider: (): { dispose: () => void } => ({ dispose: () => {} }),
	registerCodeActionsProvider: (): { dispose: () => void } => ({ dispose: () => {} })
};

const workspace = {
	findFiles: async (): Promise<Uri[]> => [],
	workspaceFolders: undefined as { uri: Uri }[] | undefined,
	textDocuments: [] as TextDocument[],
	fs: {
		readFile: async (): Promise<Uint8Array> => new Uint8Array(),
		readDirectory: async (): Promise<[string, number][]> => []
	},
	getConfiguration: (): Record<string, unknown> & {
		get: (key: string, defaultValue?: unknown) => unknown;
		update: (key: string, value: unknown, target?: number) => Thenable<void>;
	} => ({
		get: (_key: string, defaultValue?: unknown) => defaultValue,
		update: async () => undefined
	}),
	onDidChangeConfiguration: (): { dispose: () => void } => ({ dispose: () => {} }),
	createFileSystemWatcher: (): {
		onDidCreate: (listener: () => void) => { dispose: () => void };
		onDidChange: (listener: () => void) => { dispose: () => void };
		onDidDelete: (listener: () => void) => { dispose: () => void };
		dispose: () => void;
	} => ({
		onDidCreate: () => ({ dispose: () => {} }),
		onDidChange: () => ({ dispose: () => {} }),
		onDidDelete: () => ({ dispose: () => {} }),
		dispose: () => {}
	}),
	openTextDocument: async (): Promise<TextDocument> => ({
		uri: Uri.file("/tmp"),
		getText: () => "",
		positionAt: (offset: number) => new Position(0, offset),
		languageId: "plaintext",
		fileName: "tmp"
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

interface MockCancellationToken {
	isCancellationRequested: boolean;
	onCancellationRequested: (listener: () => void) => { dispose: () => void };
}

interface MockProgress {
	report: (value: { message?: string; increment?: number }) => void;
}

const window = {
	activeTextEditor: undefined as TextEditor | undefined,
	showInformationMessage: async (): Promise<string | undefined> => undefined,
	showWarningMessage: async (): Promise<string | undefined> => undefined,
	showErrorMessage: async (): Promise<string | undefined> => undefined,
	showQuickPick: async (): Promise<undefined> => undefined,
	createWebviewPanel: (): WebviewPanel => new WebviewPanel(),
	setStatusBarMessage: (): { dispose: () => void } => ({ dispose: () => {} }),
	createOutputChannel: () => ({
		appendLine: () => {},
		show: () => {},
		dispose: () => {}
	}),
	createStatusBarItem: () => ({
		name: "",
		command: "",
		text: "",
		backgroundColor: undefined as ThemeColor | undefined,
		show: () => {},
		dispose: () => {}
	}),
	__progressToken: {
		isCancellationRequested: false,
		onCancellationRequested: (): { dispose: () => void } => ({ dispose: () => {} })
	} as MockCancellationToken,
	withProgress: (
		_options: unknown,
		task: (progress: MockProgress, token: MockCancellationToken) => Thenable<unknown>
	): Thenable<unknown> => task({ report: () => {} }, window.__progressToken)
};

class Disposable {
	private readonly callOnDispose: () => void;

	constructor(callOnDispose: () => void) {
		this.callOnDispose = callOnDispose;
	}

	dispose(): void {
		this.callOnDispose();
	}
}

class EventEmitter<T> {
	private readonly listeners: Array<(e: T) => void> = [];

	readonly event = (listener: (e: T) => void): Disposable => {
		this.listeners.push(listener);
		return new Disposable(() => {
			const index = this.listeners.indexOf(listener);
			if (index !== -1) this.listeners.splice(index, 1);
		});
	};

	fire(data: T): void {
		for (const listener of [...this.listeners]) listener(data);
	}

	dispose(): void {
		this.listeners.length = 0;
	}
}

/** vscode.version constant used by the telemetry reporter's common props. */
const version = "1.101.0-mock";

type TelemetryChangeListener = (isEnabled: boolean) => void;

/**
 * Minimal, test-controllable `vscode.env` surface for the telemetry reporter.
 * Tests flip `isTelemetryEnabled` and call `__fireTelemetryChange()` to simulate the
 * user toggling the global telemetry setting.
 */
const env = {
	machineId: "mock-machine-id",
	isTelemetryEnabled: true,
	__listeners: [] as TelemetryChangeListener[],
	onDidChangeTelemetryEnabled(listener: TelemetryChangeListener): Disposable {
		env.__listeners.push(listener);
		return new Disposable(() => {
			const index = env.__listeners.indexOf(listener);
			if (index !== -1) env.__listeners.splice(index, 1);
		});
	},
	/** Test helper: set the enabled flag and notify all subscribers, mirroring VS Code. */
	__fireTelemetryChange(isEnabled: boolean): void {
		env.isTelemetryEnabled = isEnabled;
		for (const listener of [...env.__listeners]) listener(isEnabled);
	}
};

interface MockExtension {
	id: string;
	packageJSON: { extensionDependencies?: string[]; extensionPack?: string[] };
}

/**
 * Minimal, test-controllable `vscode.extensions` surface for detectEcosystem().
 * Tests set `__installed` to the list of extensions the host should report.
 */
const extensions = {
	__installed: [] as MockExtension[],
	get all(): MockExtension[] {
		return extensions.__installed;
	},
	getExtension(id: string): MockExtension | undefined {
		return extensions.__installed.find(ext => ext.id === id);
	}
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
	Disposable,
	MarkdownString,
	ThemeColor,
	ThemeIcon,
	TreeItem,
	TreeItemCollapsibleState,
	EventEmitter,
	RelativePattern,
	FileType,
	ConfigurationTarget,
	WebviewPanel,
	StatusBarAlignment,
	ProgressLocation,
	ViewColumn,
	languages,
	workspace,
	commands,
	window,
	env,
	version,
	extensions
};

export type { TextDocument, TextEditor, CodeActionContext, MockExtension, MockCancellationToken };
