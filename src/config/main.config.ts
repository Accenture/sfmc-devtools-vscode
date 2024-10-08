export const mainConfig: {
	credentialsFilename: string;
	requiredFiles: string[];
	fileExtensions: string[];
	noCopyFileExtensions: string[];
	allPlaceholder: string;
	extensionsDependencies: string[];
	messages: {
		selectedCredentialsBU: string;
		selectCredential: string;
		selectBusinessUnit: string;
		selectCommandType: string;
		selectCommand: string;
		initDevTools: string;
		initiatingDevTools: string;
		copyToBUInput: string;
		runningCommand: string;
		successRunningCommand: string;
		failureRunningCommand: string;
		unsupportedMetadataType: string;
	};
} = {
	credentialsFilename: ".mcdevrc.json",
	requiredFiles: [".mcdevrc.json", ".mcdev-auth.json"],
	fileExtensions: ["meta.json", "meta.sql", "meta.html", "meta.ssjs", "meta.amp", "doc.md"],
	noCopyFileExtensions: ["doc.md"],
	allPlaceholder: "*All*",
	extensionsDependencies: ["IBM.output-colorizer"],
	messages: {
		selectedCredentialsBU: "Select a Credential/BU before running the command",
		selectCredential: "Select one of the credentials below...",
		selectBusinessUnit: "Select all or one of the business units below...",
		selectCommandType: "Select one DevTools command type...",
		selectCommand: "Select one DevTools Command...",
		initDevTools: "Do you wish to initialize SFMC DevTools project in the current directory?",
		initiatingDevTools: "Initiating SFMC DevTools project...",
		copyToBUInput: "Select one of the actions below...",
		runningCommand: "Running DevTools Command...",
		successRunningCommand: "DevTools Command has run successfully.",
		failureRunningCommand: "Oh no. Something went wrong while running DevTools Command.",
		unsupportedMetadataType: "SFMC DevTools currently does not support one or more of the selected metadata types."
	}
};
