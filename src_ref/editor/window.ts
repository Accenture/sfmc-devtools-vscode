import { Progress, ProgressLocation, window } from "vscode";

type ProgressWindowLocal = "SourceControl" | "Window" | "Notification";

class VSCodeWindow {
	async showInformationMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response: string | undefined = await window.showInformationMessage(message, ...actions);
		return response;
	}

	async showInProgressMessage(
		local: ProgressWindowLocal,
		callbackFn: (progress: Progress<{ message: string; increment?: number }>) => Promise<void>
	) {
		await window.withProgress(
			{ location: ProgressLocation[local as keyof typeof ProgressLocation] },
			async progress => callbackFn(progress)
		);
	}
}

export default VSCodeWindow;
