import { window, StatusBarItem, StatusBarAlignment, ThemeColor } from "vscode";

function createStatusBarItem(command: string, title: string, name: string): StatusBarItem {
	let statusBar: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 110);
	statusBar.name = name;
	statusBar.command = command;
	statusBar.text = title;
	return statusBar;
}

function displayStatusBarItem(statusBar: StatusBarItem | StatusBarItem[]): StatusBarItem | StatusBarItem[] {
	[statusBar].flat().forEach((sbi: StatusBarItem) => sbi.show());
	return statusBar;
}

function getBackgroundColor(status: string) {
	return new ThemeColor(`statusBarItem.${status}Background`);
}

const editorContainers = {
	createStatusBarItem,
	displayStatusBarItem,
	getBackgroundColor
};

export { StatusBarItem, editorContainers };
