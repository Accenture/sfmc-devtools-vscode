import { window, StatusBarItem, StatusBarAlignment, ThemeColor, Uri, Tab, TabInputText } from "vscode";

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

function getActiveTabFileURI(): Uri | undefined {
	const activeTab: Tab | undefined = window.tabGroups.activeTabGroup.activeTab;
	if (activeTab && activeTab.input) {
		const activeTabInput: TabInputText = activeTab.input as TabInputText;
		return activeTabInput.uri;
	}
	return;
}

const editorContainers = {
	createStatusBarItem,
	displayStatusBarItem,
	getActiveTabFileURI,
	getBackgroundColor
};

export { StatusBarItem, editorContainers };
