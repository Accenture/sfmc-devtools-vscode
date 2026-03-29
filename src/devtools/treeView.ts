import { VSCode } from "@types";
import { ConfigExtension, ConfigDevTools } from "@config";
import * as fs from "fs";
import * as path from "path";

type TreeItemType = "credential" | "bu" | "metadataType" | "item";

class McdevTreeItem extends VSCode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: VSCode.TreeItemCollapsibleState,
		public readonly itemType: TreeItemType,
		public readonly projectPath: string,
		public readonly credentialName?: string,
		public readonly buName?: string,
		public readonly metadataType?: string,
		public readonly contextValue?: string
	) {
		super(label, collapsibleState);
		this.contextValue = itemType;
		this.tooltip = this.buildTooltip();
		this.iconPath = this.getIcon();
	}

	private buildTooltip(): string {
		switch (this.itemType) {
			case "credential":
				return `Credential: ${this.label}`;
			case "bu":
				return `Business Unit: ${this.label}`;
			case "metadataType":
				return `Metadata Type: ${this.label}`;
			case "item":
				return `${this.metadataType}: ${this.label}`;
			default:
				return this.label;
		}
	}

	private getIcon(): VSCode.ThemeIcon {
		switch (this.itemType) {
			case "credential":
				return new VSCode.ThemeIcon("key");
			case "bu":
				return new VSCode.ThemeIcon("server");
			case "metadataType":
				return new VSCode.ThemeIcon("folder");
			case "item":
				return new VSCode.ThemeIcon("file");
			default:
				return new VSCode.ThemeIcon("circle-outline");
		}
	}
}

export class McdevTreeDataProvider implements VSCode.TreeDataProvider<McdevTreeItem> {
	private _onDidChangeTreeData = new VSCode.EventEmitter<McdevTreeItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private workspacePath: string | undefined;

	constructor() {
		const folders = VSCode.workspace.workspaceFolders;
		if (folders?.length) {
			this.workspacePath = folders[0].uri.fsPath;
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: McdevTreeItem): VSCode.TreeItem {
		return element;
	}

	async getChildren(element?: McdevTreeItem): Promise<McdevTreeItem[]> {
		if (!this.workspacePath) return [];

		if (!element) {
			return this.getCredentials();
		}

		switch (element.itemType) {
			case "credential":
				return this.getBusinessUnits(element);
			case "bu":
				return this.getMetadataTypes(element);
			case "metadataType":
				return this.getItems(element);
			default:
				return [];
		}
	}

	private getCredentials(): McdevTreeItem[] {
		if (!this.workspacePath) return [];

		const configPath = path.join(this.workspacePath, ConfigDevTools.mcdevConfigurationFile);
		if (!fs.existsSync(configPath)) return [];

		try {
			const content = fs.readFileSync(configPath, "utf-8");
			const config = JSON.parse(content);
			const credentials = config.credentials || {};
			return Object.keys(credentials).map(
				cred =>
					new McdevTreeItem(
						cred,
						VSCode.TreeItemCollapsibleState.Collapsed,
						"credential",
						this.workspacePath!,
						cred
					)
			);
		} catch {
			return [];
		}
	}

	private getBusinessUnits(credentialItem: McdevTreeItem): McdevTreeItem[] {
		if (!this.workspacePath) return [];

		const configPath = path.join(this.workspacePath, ConfigDevTools.mcdevConfigurationFile);
		if (!fs.existsSync(configPath)) return [];

		try {
			const content = fs.readFileSync(configPath, "utf-8");
			const config = JSON.parse(content);
			const credential = config.credentials?.[credentialItem.label];
			if (!credential?.businessUnits) return [];

			return Object.keys(credential.businessUnits).map(
				bu =>
					new McdevTreeItem(
						bu,
						VSCode.TreeItemCollapsibleState.Collapsed,
						"bu",
						credentialItem.projectPath,
						credentialItem.label,
						bu
					)
			);
		} catch {
			return [];
		}
	}

	private getMetadataTypes(buItem: McdevTreeItem): McdevTreeItem[] {
		if (!this.workspacePath) return [];

		const retrievePath = path.join(this.workspacePath, "retrieve", buItem.credentialName!, buItem.buName!);

		if (!fs.existsSync(retrievePath)) return [];

		try {
			const entries = fs.readdirSync(retrievePath, { withFileTypes: true });
			return entries
				.filter(e => e.isDirectory())
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(
					dir =>
						new McdevTreeItem(
							dir.name,
							VSCode.TreeItemCollapsibleState.Collapsed,
							"metadataType",
							buItem.projectPath,
							buItem.credentialName,
							buItem.buName,
							dir.name
						)
				);
		} catch {
			return [];
		}
	}

	private getItems(mdtItem: McdevTreeItem): McdevTreeItem[] {
		if (!this.workspacePath) return [];

		const mdtPath = path.join(
			this.workspacePath,
			"retrieve",
			mdtItem.credentialName!,
			mdtItem.buName!,
			mdtItem.metadataType!
		);

		if (!fs.existsSync(mdtPath)) return [];

		try {
			const entries = fs.readdirSync(mdtPath, { withFileTypes: true });
			return entries
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(entry => {
					const isDir = entry.isDirectory();
					return new McdevTreeItem(
						entry.name,
						isDir ? VSCode.TreeItemCollapsibleState.Collapsed : VSCode.TreeItemCollapsibleState.None,
						"item",
						mdtItem.projectPath,
						mdtItem.credentialName,
						mdtItem.buName,
						mdtItem.metadataType
					);
				});
		} catch {
			return [];
		}
	}
}

export function registerTreeView(context: VSCode.ExtensionContext): McdevTreeDataProvider {
	const treeDataProvider = new McdevTreeDataProvider();
	const treeView = VSCode.window.createTreeView(`${ConfigExtension.extensionName}.explorer`, {
		treeDataProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeView);

	VSCode.commands.registerCommand(`${ConfigExtension.extensionName}.refreshTreeView`, () => {
		treeDataProvider.refresh();
	});

	return treeDataProvider;
}
