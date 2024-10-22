import { TEditor, VSCode } from "@types";

class VSCodeWindow {
	private window: typeof VSCode.window = VSCode.window;
	private statusBarItems: { [name: string]: VSCode.StatusBarItem };
	private outputChannelItems: { [name: string]: VSCode.OutputChannel };

	constructor() {
		this.statusBarItems = this.outputChannelItems = {};
	}

	async showInformationMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response: string | undefined = await this.window.showInformationMessage(message, ...actions);
		return response;
	}

	async showProgressBar(
		title: string,
		local: TEditor.ProgressWindowLocal,
		cancellable: boolean,
		progressHandler: (
			progress: TEditor.ProgressBar,
			cancelToken: TEditor.ProgressBarCancellation
		) => Thenable<unknown>
	) {
		this.window.withProgress(
			{ title, location: VSCode.ProgressLocation[local as keyof typeof VSCode.ProgressLocation], cancellable },
			progressHandler
		);
	}

	createOutputChannel(name: string) {
		const outputChannel: VSCode.OutputChannel = this.window.createOutputChannel(name);
		if (!outputChannel) throw new Error(`VSCodeWindow: Failed to create OutputChannel name = ${name}.`);
		this.outputChannelItems = { ...this.outputChannelItems, [name]: outputChannel };
	}

	getOutputChannel(name: string): VSCode.OutputChannel {
		if (!this.outputChannelItems || !this.outputChannelItems[name]) this.createOutputChannel(name);
		return this.outputChannelItems[name];
	}

	displayOutputChannel(name: string) {
		const outputChannel: VSCode.OutputChannel = this.getOutputChannel(name);
		outputChannel.show();
	}

	appendTextToOutputChannel(name: string, text: string) {
		const outputChannel: VSCode.OutputChannel = this.getOutputChannel(name);
		outputChannel.appendLine(text);
	}

	createStatusBarItem(command: string, title: string, name: string) {
		const statusBarItem: VSCode.StatusBarItem = this.window.createStatusBarItem(
			VSCode.StatusBarAlignment.Right,
			110
		);
		statusBarItem.name = name;
		statusBarItem.command = command;
		statusBarItem.text = title;
		this.statusBarItems = { ...this.statusBarItems, [name]: statusBarItem };
	}

	getStatusBarItem(name: string): VSCode.StatusBarItem {
		if (!this.statusBarItems) throw new Error("VSCodeWindow: Status Bar Item is undefined.");
		if (!this.statusBarItems[name])
			throw new Error(`VSCodeWindow: Status Bar Item with name = ${name} wasn't found.`);
		return this.statusBarItems[name];
	}

	displayStatusBarItem(name: string) {
		const statusBarItem: VSCode.StatusBarItem = this.getStatusBarItem(name);
		if (statusBarItem) statusBarItem.show();
	}

	updateStatusBarItem(name: string, fieldsToUpdate: { [key in TEditor.StatusBarFields]?: string }) {
		const statusBarItem: VSCode.StatusBarItem = this.getStatusBarItem(name);
		Object.entries(fieldsToUpdate).forEach(([field, value]) => {
			if (field === "text") statusBarItem[field] = value;
			else if (field === "backgroundColor")
				statusBarItem[field] = new VSCode.ThemeColor(`statusBarItem.${value}Background`);
		});
	}

	getEditorOpenedFilePath(): string {
		const activeTextEditor: VSCode.TextEditor | undefined = this.window.activeTextEditor;
		if (!activeTextEditor) throw new Error("VSCodeWindow: Active text editor is undefined.");
		return activeTextEditor.document.uri.path;
	}
}

export default VSCodeWindow;
