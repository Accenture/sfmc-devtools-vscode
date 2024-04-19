import { IEditor, IDevTools } from "../types";

export default function (editor: IEditor.IInstance): IDevTools.IDevToolsUtils {
	async function isDevToolsProject(files: string[]): Promise<boolean> {
		const filesInFolderResult: boolean[] = await Promise.all(
			files.map(async (file: string) => await editor.workspace.isFileInFolder(file))
		);
		return filesInFolderResult.every((fileResult: boolean) => fileResult);
	}

	async function subFoldersAreDevToolsProject() {
		const subFolders: string[] = await editor.workspace.getSubFolders();
		console.log(subFolders);
	}
	return { isDevToolsProject, subFoldersAreDevToolsProject };
}
