import { prerequisitesConfig, NoPrerequisitesResponseOptions } from "../config/prerequisites.config";
import { devtoolsInstaller } from "./installer";
import { terminal } from "../shared/utils/terminal";
import { editorInput } from "../editor/input";
import { editorWebview } from "../editor/webview";
import { editorWorkspace } from "../editor/workspace";
import { log } from "../editor/output";

interface PrerequisitesInstalledReturn {
	prerequisitesInstalled: boolean;
	missingPrerequisites: string[];
}

async function arePrerequisitesInstalled(): Promise<PrerequisitesInstalledReturn> {
	let prerequisiteResult: PrerequisitesInstalledReturn = { prerequisitesInstalled: true, missingPrerequisites: [] };
	for (const [prerequisite, command] of Object.entries(prerequisitesConfig.packages)) {
		await new Promise<void>(resolve => {
			terminal.executeTerminalCommand({
				command,
				args: [],
				cwd: editorWorkspace.getWorkspaceURIPath(),
				handleResult: (error: string | null, output: string | null, code: number | null) => {
					if (error) {
						log(
							"error",
							`[prerequisites_arePrerequisitesInstalled] Missing Pre-Requisite '${prerequisite}': ${error}`
						);
						prerequisiteResult = {
							prerequisitesInstalled: false,
							missingPrerequisites: [...prerequisiteResult.missingPrerequisites, prerequisite]
						};
					}
					if (output) {
						log("debug", `[prerequisites_arePrerequisitesInstalled] '${prerequisite}': ${output}`);
					}
					if (code !== null) {
						log("debug", `[prerequisites_arePrerequisitesInstalled] Exit Code: '${code}'`);
						resolve();
					}
				}
			});
		});
	}
	return prerequisiteResult;
}

async function noPrerequisitesHandler(extensionPath: string, missingPrerequisites: string[]): Promise<void> {
	// checks if the one or more prerequisites are missing to show the correct message.
	const missingPrerequisitesMessage: string =
		missingPrerequisites.length === 1
			? prerequisitesConfig.messages["onePrerequisiteMissing"].replace(
					"{{prerequisites}}",
					missingPrerequisites[0]
				)
			: prerequisitesConfig.messages["multiplePrerequisitesMissing"].replace(
					"{{prerequisites}}",
					missingPrerequisites.join(" and ")
				);

	const message: string = `${missingPrerequisitesMessage} ${prerequisitesConfig.messages.askPrerequisitesToUser}`;

	// Asks if user wishes to follow the guide of how to install the prerequisites
	const userResponse: string | undefined = await editorInput.handleShowOptionsMessage(
		message,
		Object.keys(NoPrerequisitesResponseOptions).filter(v => isNaN(Number(v)))
	);

	log("debug", `[prerequisites_noPrerequisitesHandler] User Response = ${userResponse}.`);

	// If yes creates an webview in vscode with a installation guide
	if (userResponse && NoPrerequisitesResponseOptions[userResponse as keyof typeof NoPrerequisitesResponseOptions]) {
		editorWebview.create({
			id: prerequisitesConfig.webview.id,
			title: prerequisitesConfig.webview.title,
			extensionPath: extensionPath,
			filename: prerequisitesConfig.webview.filename,
			handler: ({ command }: { command: string }) => {
				if (command === "install") {
					devtoolsInstaller.installDevTools();
					return { dispose: true };
				}
				return { dispose: false };
			}
		});
	}
}

const devtoolsPrerequisites = {
	arePrerequisitesInstalled,
	noPrerequisitesHandler
};

export { PrerequisitesInstalledReturn, devtoolsPrerequisites };
