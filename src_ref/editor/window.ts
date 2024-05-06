import { window } from "vscode";

class VSCodeWindow {
	async showInformationMessageWithOptions(message: string, actions: string[]): Promise<string | undefined> {
		const response: string | undefined = await window.showInformationMessage(message, ...actions);
		return response;
	}
}

export default VSCodeWindow;
