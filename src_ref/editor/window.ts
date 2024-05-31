import { OutputChannel, ProgressLocation, StatusBarAlignment, StatusBarItem, window } from "vscode";

type ProgressWindowLocal = "SourceControl" | "Window" | "Notification";

class VSCodeWindow {
	private statusBarItems: { [name: string]: StatusBarItem };
	private outputChannelItems: { [name: string]: OutputChannel };

	constructor() {
		this.statusBarItems = this.outputChannelItems = {};
	}

	async showInformationMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response: string | undefined = await window.showInformationMessage(message, ...actions);
		return response;
	}

	async showInProgressMessage(local: ProgressWindowLocal, progressMessage: string, progressFn: () => void) {
		await window.withProgress(
			{ location: ProgressLocation[local as keyof typeof ProgressLocation] },
			async progress => {
				progress.report({ message: progressMessage });
				progressFn();
			}
		);
	}

	createOutputChannel(name: string) {
		const outputChannel: OutputChannel = window.createOutputChannel(name);
		if (!outputChannel) throw new Error(`VSCodeWindow: Failed to create OutputChannel name = ${name}.`);
		this.outputChannelItems = { ...this.outputChannelItems, [name]: outputChannel };
	}

	getOutputChannel(name: string): OutputChannel {
		if (!this.outputChannelItems || !this.outputChannelItems[name]) this.createOutputChannel(name);
		return this.outputChannelItems[name];
	}

	displayOutputChannel(name: string) {
		const outputChannel: OutputChannel = this.getOutputChannel(name);
		outputChannel.show();
	}

	createStatusBarItem(command: string, title: string, name: string) {
		const statusBarItem: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 110);
		statusBarItem.name = name;
		statusBarItem.command = command;
		statusBarItem.text = title;
		this.statusBarItems = { ...this.statusBarItems, [name]: statusBarItem };
	}

	getStatusBarItem(name: string): StatusBarItem {
		if (!this.statusBarItems) throw new Error("VSCodeWindow: Status Bar Item is undefined.");
		if (!this.statusBarItems[name])
			throw new Error(`VSCodeWindow: Status Bar Item with name = ${name} wasn't found.`);
		return this.statusBarItems[name];
	}

	displayStatusBarItem(name: string) {
		const statusBarItem: StatusBarItem = this.getStatusBarItem(name);
		if (statusBarItem) statusBarItem.show();
	}
}

export default VSCodeWindow;
