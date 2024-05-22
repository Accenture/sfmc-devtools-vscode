import { ProgressLocation, StatusBarAlignment, StatusBarItem, window } from "vscode";

type ProgressWindowLocal = "SourceControl" | "Window" | "Notification";

class VSCodeWindow {
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

	createStatusBarItem(command: string, title: string, name: string): StatusBarItem {
		let statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 110);
		statusBar.name = name;
		statusBar.command = command;
		statusBar.text = title;
		return statusBar;
	}
}

export default VSCodeWindow;
