import { ProgressLocation, window } from "vscode";

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
}

export default VSCodeWindow;
