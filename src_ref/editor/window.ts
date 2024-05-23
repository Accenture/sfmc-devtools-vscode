import { ProgressLocation, StatusBarAlignment, StatusBarItem, window } from "vscode";

type ProgressWindowLocal = "SourceControl" | "Window" | "Notification";

class VSCodeWindow {
	private statusBarItem: StatusBarItem | undefined;
	async showInformationMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response: string | undefined = await window.showInformationMessage(message, ...actions);
		return response;
	}

	async showInProgressMessage(local: ProgressWindowLocal, progressMessage: string, progressFn: () => {}) {
		await window.withProgress(
			{ location: ProgressLocation[local as keyof typeof ProgressLocation] },
			async progress => {
				progress.report({ message: progressMessage });
				progressFn();
			}
		);
	}

	createStatusBarItem(command: string, title: string, name: string) {
		this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 110);
		this.statusBarItem.name = name;
		this.statusBarItem.command = command;
		this.statusBarItem.text = title;
	}

	getStatusBarItem(): StatusBarItem | undefined {
		if (!this.statusBarItem) throw new Error("VSCodeWindow: Status Bar Item is undefined.");
		return this.statusBarItem;
	}
}

export default VSCodeWindow;
