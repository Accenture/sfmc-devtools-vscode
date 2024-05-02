import { IEditor, IDevTools } from "@types";

export default function (editor: IEditor.IInstance): IDevTools.IDevToolsUtils {
	async function isDevToolsProject(files: string[]): Promise<boolean> {
		console.log("=== Utils: Is DevTools Project ===");
		const filesInFolderResult: boolean[] = await Promise.all(
			files.map(async (file: string) => await editor.workspace.isFileInFolder(file))
		);
		return filesInFolderResult.every((fileResult: boolean) => fileResult);
	}

	async function subFoldersAreDevToolsProject() {
		console.log("=== Utils: SubFolders Are DevTools Project ===");
		const subFolders: string[] = await editor.workspace.getSubFolders();
		console.log(subFolders);
	}
	return { isDevToolsProject, subFoldersAreDevToolsProject };
}
