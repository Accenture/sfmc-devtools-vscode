const extensionName = "sfmc-devtools-vscode";
const recommendedExtensions = [
	"joernberkefeld.sfmc-language",
	"IBM.output-colorizer",
	"aaron-bond.better-comments",
	"dbaeumer.vscode-eslint",
	"editorconfig.editorconfig",
	"esbenp.prettier-vscode"
];
const menuCommands = [
	"changekey",
	"copytobu",
	"delete",
	"deploy",
	"retrieve",
	"execute",
	"schedule",
	"pause",
	"stop",
	"publish",
	"validate",
	"refresh",
	"build",
	"createDeltaPkg",
	"fixKeys"
];
const delayTimeUpdateStatusBar = 10000; // 10 seconds

export { extensionName, recommendedExtensions, menuCommands, delayTimeUpdateStatusBar };
