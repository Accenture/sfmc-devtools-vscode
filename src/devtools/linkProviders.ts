import ContentBlockLinkProvider, { ASSET_CACHE_GLOB } from "../editor/contentBlockLinkProvider";
import RelatedItemLinkProvider from "../editor/relatedItemLinkProvider";
import RelatedItemDiagnosticProvider from "../editor/relatedItemDiagnosticProvider";
import RelatedItemCodeActionProvider, {
	RETRIEVE_RELATED_ITEM_COMMAND,
	type IRetrieveRelatedItemArgs
} from "../editor/relatedItemCodeActionProvider";
import ContentBlockDiagnosticProvider from "../editor/contentBlockDiagnosticProvider";
import ContentBlockCodeActionProvider, {
	RETRIEVE_CONTENT_BLOCK_COMMAND,
	type IRetrieveContentBlockArgs
} from "../editor/contentBlockCodeActionProvider";
import DataExtensionLinkProvider from "../editor/dataExtensionLinkProvider";
import ScriptDataExtensionLinkProvider from "../editor/scriptDataExtensionLinkProvider";
import ScriptDiagnosticProvider from "../editor/scriptDiagnosticProvider";
import ScriptCodeActionProvider, {
	RETRIEVE_SCRIPT_DE_COMMAND,
	type IRetrieveScriptDataExtensionArgs
} from "../editor/scriptCodeActionProvider";
import SqlDiagnosticProvider from "../editor/sqlDiagnosticProvider";
import SqlDataViewHoverProvider from "../editor/sqlDataViewHoverProvider";
import SqlCodeActionProvider, {
	RETRIEVE_SQL_DE_COMMAND,
	type IRetrieveSqlDataExtensionArgs
} from "../editor/sqlCodeActionProvider";
import { StatusBarTooltipProvider } from "../editor/statusBarTooltipProvider";
import { ConfigExtension } from "@config";
import { EnumsExtension } from "@enums";
import { TDevTools, TEditor, VSCode } from "@types";
import { Lib, File } from "utils";
import Mcdev from "./mcdev";

interface LinkProviderDeps {
	vscodeContext: TEditor.VSCodeContext;
	vscodeWorkspace: TEditor.VSCodeWorkspace;
	mcdev: Mcdev;
	tooltipProvider: StatusBarTooltipProvider;
	writeLog: (channel: string, message: string, level: EnumsExtension.LoggerLevel) => void;
	executeCommand: (command: string, params: TDevTools.IExecuteParameters) => Promise<boolean>;
}

/**
 * Registers document link providers for the extension.
 *
 * 1. ContentBlockLinkProvider – enables Ctrl+Click navigation from
 *    ContentBlockByKey() references to the corresponding asset file.
 *    A key cache is pre-built by scanning retrieve/<cred>/<bu>/asset/{other,block}
 *    files on startup (fire-and-forget) and kept live via a FileSystemWatcher.
 *
 * 2. RelatedItemLinkProvider – enables Ctrl+Click navigation from
 *    r__TYPE_key values (and automation r__type / r__key pairs) in JSON
 *    metadata files to the corresponding metadata file in the same BU tree.
 *    Links are resolved on demand and cached after the first lookup.
 *
 * 3. DataExtensionLinkProvider – enables Ctrl+Click navigation from
 *    dataExtension names referenced in FROM / JOIN clauses of SQL query
 *    files (retrieve/<cred>/<bu>/query/*.sql) to the corresponding
 *    dataExtension-meta.json file.  Names prefixed with "ENT." (case-
 *    insensitive) are resolved against the parent BU folder instead.
 *    A per-BU name cache is built lazily the first time a query file for
 *    that BU is opened.
 *
 * 4. RelatedItemDiagnosticProvider – emits VS Code diagnostics (shown
 *    inline, in the Problems panel, and as a coloured file indicator in
 *    the Explorer) for every r__TYPE_key / r__type + r__key reference
 *    whose target file cannot be found in the retrieve tree:
 *      • Warning  — when the type folder has never been retrieved.
 *      • Warning  — when the folder exists but the specific key is absent.
 *    Types not listed in metaDataTypes.retrieve in .mcdevrc.json, or
 *    types that do not support deploy, are silently ignored.
 *
 * 5. RelatedItemCodeActionProvider – provides a "Retrieve type:key from
 *    cred/bu" quick fix for each unresolved-reference diagnostic.  After
 *    the retrieve completes only the triggering document is re-validated.
 *
 * 6. ContentBlockDiagnosticProvider – emits VS Code diagnostics for every
 *    ContentBlockByKey() reference whose key cannot be found in the global
 *    asset key cache (retrieve/<cred>/<bu>/asset/{other,block}/).
 *    Controlled by the warnOnContentBlockByKey setting (default: true).
 *
 * 7. ContentBlockCodeActionProvider – provides a "Retrieve asset:key from
 *    cred/bu" quick fix for each unresolved ContentBlockByKey diagnostic.
 *
 * 8. SqlDataViewHoverProvider – shows hover-only informational hints for
 *    known SFMC system data views (e.g. _Sent) in SQL query files.
 *    Controlled by the showSqlDataViewHoverNotice setting (default: true).
 *
 * 9. SqlDiagnosticProvider – emits VS Code warning diagnostics for SQL
 *    query files when data extension names cannot be resolved in the
 *    retrieve tree. Controlled by the warnOnMissingSqlDataExtension
 *    setting (default: true).
 *
 * 10. SqlCodeActionProvider – provides a "Retrieve dataExtension:name from
 *    cred/bu" quick fix for each unresolved SQL data-extension diagnostic.
 *
 * 11. ScriptDataExtensionLinkProvider – enables Ctrl+Click navigation from
 *    dataExtension names referenced in SSJS / AMPscript function calls
 *    (e.g. Lookup, LookupRows, InsertData, proxy.retrieve, etc.) in
 *    .amp/.ssjs/.html/.js files to the corresponding
 *    dataExtension-meta.json file.
 *
 * 12. ScriptDiagnosticProvider – emits VS Code warning diagnostics for
 *    .amp/.ssjs/.html/.js files when data extension names in SSJS /
 *    AMPscript function calls cannot be resolved in the retrieve tree.
 *    Controlled by the warnOnMissingScriptDataExtension setting
 *    (default: true).
 *
 * 13. ScriptCodeActionProvider – provides a "Retrieve dataExtension:name
 *    from cred/bu" quick fix for each unresolved script data-extension
 *    diagnostic.
 *
 * All diagnostic providers are always registered; validation is gated at
 * runtime by their respective feature-flag settings so that users can
 * toggle them without restarting the extension.
 *
 * @param {LinkProviderDeps} deps - dependencies injected from the DevToolsExtension class
 * @returns {void}
 */
export function activateLinkProviders(deps: LinkProviderDeps): void {
	const vscodeContext = deps.vscodeContext;
	const vscodeWorkspace = deps.vscodeWorkspace;
	const packageName = deps.mcdev.getPackageName();

	const isEnabled = (key: string): boolean =>
		vscodeWorkspace.isConfigurationKeyEnabled(ConfigExtension.extensionName, key);

	const provider = new ContentBlockLinkProvider(() => isEnabled("contentBlockGoToDefinition"));

	// Register and track ContentBlock key cache in tooltip
	deps.tooltipProvider.addCacheEntry("contentBlockKeys", "Content Block Keys");
	deps.tooltipProvider.update();
	deps.writeLog(packageName, "Caching Content Block keys...", EnumsExtension.LoggerLevel.INFO);

	// Populate the key cache in the background; links resolve instantly once ready
	provider
		.init()
		.then(() => {
			deps.tooltipProvider.setCacheDone("contentBlockKeys");
			deps.writeLog(packageName, "Caching Content Block keys done", EnumsExtension.LoggerLevel.INFO);
		})
		.catch(err => {
			console.error("[sfmc-devtools-vscode] ContentBlockLinkProvider cache init failed:", err);
			deps.tooltipProvider.setCacheDone("contentBlockKeys");
			deps.writeLog(packageName, `Caching Content Block keys failed: ${err}`, EnumsExtension.LoggerLevel.WARN);
		});

	// Keep the cache live as asset files are added or removed
	const workspaceUri = vscodeWorkspace.getWorkspaceURI();
	// The diagnostic provider is always created so its cache stays in sync
	// with the file system watcher. Validation is gated at runtime by the
	// warnOnContentBlockByKey setting so users can toggle without restarting.
	const contentBlockDiagnosticProvider = new ContentBlockDiagnosticProvider();
	vscodeContext.registerDisposable(contentBlockDiagnosticProvider.getDiagnosticCollection());

	contentBlockDiagnosticProvider.init().catch(err => {
		console.error("[sfmc-devtools-vscode] ContentBlockDiagnosticProvider cache init failed:", err);
	});

	if (workspaceUri) {
		const watcher = VSCode.workspace.createFileSystemWatcher(
			new VSCode.RelativePattern(workspaceUri, ASSET_CACHE_GLOB)
		);
		watcher.onDidCreate(uri => {
			provider.addToCache(uri);
			contentBlockDiagnosticProvider.addToCache(uri);
			if (isEnabled("warnOnContentBlockByKey")) {
				VSCode.workspace.textDocuments.forEach(doc => {
					contentBlockDiagnosticProvider.validateDocument(doc).catch(err => {
						console.error(
							"[sfmc-devtools-vscode] ContentBlockDiagnosticProvider create revalidation failed:",
							err
						);
					});
				});
			}
		});
		watcher.onDidDelete(uri => {
			provider.removeFromCache(uri);
			contentBlockDiagnosticProvider.removeFromCache(uri);
		});
		vscodeContext.registerDisposable(watcher);
	}

	vscodeContext.registerDisposable(VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, provider));

	// Register on-demand link provider for r__TYPE_key relation fields in JSON files
	const relatedItemProvider = new RelatedItemLinkProvider();
	vscodeContext.registerDisposable(
		VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, relatedItemProvider)
	);

	// Register on-demand link provider for dataExtension names in SQL query files
	const dataExtensionProvider = new DataExtensionLinkProvider();
	vscodeContext.registerDisposable(
		VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, dataExtensionProvider)
	);

	// Register on-demand link provider for dataExtension names in SSJS / AMPscript files
	const scriptDeProvider = new ScriptDataExtensionLinkProvider();
	vscodeContext.registerDisposable(
		VSCode.languages.registerDocumentLinkProvider({ scheme: "file" }, scriptDeProvider)
	);

	// Register on-demand caching entries in the tooltip
	deps.tooltipProvider.addCacheEntry("relatedItems", "JSON Relation Lookup (on open/save)");
	deps.tooltipProvider.addCacheEntry("sqlDataExtensions", "SQL Data Extension Lookup (on open/save)");
	deps.tooltipProvider.addCacheEntry("scriptDataExtensions", "Script Data Extension Lookup (on open/save)");
	// On-demand entries start as done since they activate per-file
	deps.tooltipProvider.setCacheDone("relatedItems");
	deps.tooltipProvider.setCacheDone("sqlDataExtensions");
	deps.tooltipProvider.setCacheDone("scriptDataExtensions");
	deps.writeLog(
		packageName,
		"Registered on-demand link providers (JSON relations, SQL data extensions, script data extensions)",
		EnumsExtension.LoggerLevel.INFO
	);

	// ── Diagnostic + quick-fix providers for unresolvable r__ references ──
	// Providers are always registered; validation is gated at runtime by the
	// warnOnMissingJsonRelation setting so users can toggle without restarting.

	const configuredTypesCache = new Map<string, string[] | null>();
	const shouldValidateType = (type: string, projectPath: string): boolean => {
		if (!deps.mcdev.isActionSupportedForType("deploy", type)) return false;

		if (!configuredTypesCache.has(projectPath)) {
			try {
				const configPath = Lib.removeLeadingRootDrivePath(deps.mcdev.getConfigFilePath(projectPath));
				const content = File.readFileSync(configPath);
				const config = JSON.parse(content) as TDevTools.IConfigFile;
				configuredTypesCache.set(projectPath, config?.metaDataTypes?.retrieve ?? null);
			} catch {
				configuredTypesCache.set(projectPath, null);
			}
		}
		const configuredTypes = configuredTypesCache.get(projectPath) ?? null;
		if (configuredTypes && !configuredTypes.includes(type)) return false;
		return true;
	};

	const diagnosticProvider = new RelatedItemDiagnosticProvider(shouldValidateType);
	vscodeContext.registerDisposable(diagnosticProvider.getDiagnosticCollection());

	if (isEnabled("warnOnMissingJsonRelation")) {
		VSCode.workspace.textDocuments.forEach(doc => {
			diagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider init validation failed:", err);
			});
		});
	}

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidOpenTextDocument(doc => {
			if (!isEnabled("warnOnMissingJsonRelation")) {
				diagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			deps.tooltipProvider.setCacheLoading("relatedItems");
			diagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider open validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("relatedItems");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidSaveTextDocument(doc => {
			if (!isEnabled("warnOnMissingJsonRelation")) {
				diagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			if (doc.uri.path.includes("/retrieve/")) diagnosticProvider.clearCache();
			deps.tooltipProvider.setCacheLoading("relatedItems");
			diagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] RelatedItemDiagnosticProvider save validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("relatedItems");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidCloseTextDocument(doc => {
			diagnosticProvider.clearDocument(doc.uri);
		})
	);

	vscodeContext.registerDisposable(
		VSCode.languages.registerCodeActionsProvider(
			{ language: "json", scheme: "file" },
			new RelatedItemCodeActionProvider(),
			{ providedCodeActionKinds: [VSCode.CodeActionKind.QuickFix] }
		)
	);

	vscodeContext.registerDisposable(
		VSCode.commands.registerCommand(
			RETRIEVE_RELATED_ITEM_COMMAND,
			async ({ projectPath, credBu, type, key, documentUri }: IRetrieveRelatedItemArgs) => {
				const [credentialsName, businessUnit] = credBu.split("/");
				const fileDetail: TDevTools.IExecuteFileDetails = {
					level: "file",
					projectPath,
					topFolder: "/retrieve/",
					path: `${projectPath}/retrieve/${credBu}/${type}/${key}.${type}-meta.json`,
					credentialsName,
					businessUnit,
					metadataType: type,
					filename: key
				};
				const success = await deps.executeCommand("retrieve", { filesDetails: [fileDetail] });
				if (success) {
					diagnosticProvider.clearCache();
					const doc = VSCode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
					if (doc) {
						diagnosticProvider.validateDocument(doc).catch(err => {
							console.error(
								"[sfmc-devtools-vscode] RelatedItemDiagnosticProvider post-retrieve validation failed:",
								err
							);
						});
					}
				}
			}
		)
	);

	// ── ContentBlockByKey diagnostic + quick-fix providers ──
	// Validation is gated at runtime by the warnOnContentBlockByKey setting.

	if (isEnabled("warnOnContentBlockByKey")) {
		VSCode.workspace.textDocuments.forEach(doc => {
			contentBlockDiagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] ContentBlockDiagnosticProvider init validation failed:", err);
			});
		});
	}

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidOpenTextDocument(doc => {
			if (!isEnabled("warnOnContentBlockByKey")) {
				contentBlockDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			contentBlockDiagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] ContentBlockDiagnosticProvider open validation failed:", err);
			});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidSaveTextDocument(doc => {
			if (!isEnabled("warnOnContentBlockByKey")) {
				contentBlockDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			contentBlockDiagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] ContentBlockDiagnosticProvider save validation failed:", err);
			});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidCloseTextDocument(doc => {
			contentBlockDiagnosticProvider.clearDocument(doc.uri);
		})
	);

	vscodeContext.registerDisposable(
		VSCode.languages.registerCodeActionsProvider({ scheme: "file" }, new ContentBlockCodeActionProvider(), {
			providedCodeActionKinds: [VSCode.CodeActionKind.QuickFix]
		})
	);

	vscodeContext.registerDisposable(
		VSCode.commands.registerCommand(
			RETRIEVE_CONTENT_BLOCK_COMMAND,
			async ({ projectPath, credBu, key, documentUri }: IRetrieveContentBlockArgs) => {
				const [credentialsName, businessUnit] = credBu.split("/");
				const fileDetail: TDevTools.IExecuteFileDetails = {
					level: "file",
					projectPath,
					topFolder: "/retrieve/",
					path: `${projectPath}/retrieve/${credBu}/asset/${key}.asset-meta.json`,
					credentialsName,
					businessUnit,
					metadataType: "asset",
					filename: key
				};
				const success = await deps.executeCommand("retrieve", { filesDetails: [fileDetail] });
				if (success) {
					const doc = VSCode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
					if (doc) {
						contentBlockDiagnosticProvider.validateDocument(doc).catch(err => {
							console.error(
								"[sfmc-devtools-vscode] ContentBlockDiagnosticProvider post-retrieve validation failed:",
								err
							);
						});
					}
				}
			}
		)
	);

	// ── SQL hover + diagnostic + quick-fix providers ──
	// showSqlDataViewHoverNotice is checked at registration time (hover
	// providers do not emit persistent diagnostics).

	if (isEnabled("showSqlDataViewHoverNotice")) {
		vscodeContext.registerDisposable(
			VSCode.languages.registerHoverProvider({ language: "sql", scheme: "file" }, new SqlDataViewHoverProvider())
		);
	}

	// SQL diagnostic providers are always registered; validation is gated at
	// runtime by the warnOnMissingSqlDataExtension setting.

	const sqlDiagnosticProvider = new SqlDiagnosticProvider();
	vscodeContext.registerDisposable(sqlDiagnosticProvider.getDiagnosticCollection());

	if (workspaceUri) {
		const deWatcher = VSCode.workspace.createFileSystemWatcher(
			new VSCode.RelativePattern(workspaceUri, "**/retrieve/**/dataExtension/*.dataExtension-meta.json")
		);
		const revalidateOpenSqlDocs = () => {
			sqlDiagnosticProvider.clearCache();
			if (isEnabled("warnOnMissingSqlDataExtension")) {
				VSCode.workspace.textDocuments.forEach(doc => {
					sqlDiagnosticProvider.validateDocument(doc).catch(err => {
						console.error(
							"[sfmc-devtools-vscode] SqlDiagnosticProvider DE-change revalidation failed:",
							err
						);
					});
				});
			}
		};
		deWatcher.onDidCreate(revalidateOpenSqlDocs);
		deWatcher.onDidDelete(revalidateOpenSqlDocs);
		deWatcher.onDidChange(revalidateOpenSqlDocs);
		vscodeContext.registerDisposable(deWatcher);
	}

	if (isEnabled("warnOnMissingSqlDataExtension")) {
		VSCode.workspace.textDocuments.forEach(doc => {
			sqlDiagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] SqlDiagnosticProvider init validation failed:", err);
			});
		});
	}

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidOpenTextDocument(doc => {
			if (!isEnabled("warnOnMissingSqlDataExtension")) {
				sqlDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			deps.tooltipProvider.setCacheLoading("sqlDataExtensions");
			sqlDiagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] SqlDiagnosticProvider open validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("sqlDataExtensions");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidSaveTextDocument(doc => {
			if (!isEnabled("warnOnMissingSqlDataExtension")) {
				sqlDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			deps.tooltipProvider.setCacheLoading("sqlDataExtensions");
			sqlDiagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] SqlDiagnosticProvider save validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("sqlDataExtensions");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidChangeTextDocument(event => {
			if (!isEnabled("warnOnMissingSqlDataExtension")) {
				sqlDiagnosticProvider.getDiagnosticCollection().delete(event.document.uri);
				return;
			}
			sqlDiagnosticProvider.validateDocument(event.document).catch(err => {
				console.error("[sfmc-devtools-vscode] SqlDiagnosticProvider change validation failed:", err);
			});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidCloseTextDocument(doc => {
			sqlDiagnosticProvider.clearDocument(doc.uri);
		})
	);

	vscodeContext.registerDisposable(
		VSCode.languages.registerCodeActionsProvider({ language: "sql", scheme: "file" }, new SqlCodeActionProvider(), {
			providedCodeActionKinds: [VSCode.CodeActionKind.QuickFix]
		})
	);

	vscodeContext.registerDisposable(
		VSCode.commands.registerCommand(
			RETRIEVE_SQL_DE_COMMAND,
			async ({ projectPath, credBu, name, documentUri }: IRetrieveSqlDataExtensionArgs) => {
				const [credentialsName, businessUnit] = credBu.split("/");
				const fileDetail: TDevTools.IExecuteFileDetails = {
					level: "file",
					projectPath,
					topFolder: "/retrieve/",
					path: `${projectPath}/retrieve/${credBu}/dataExtension/`,
					credentialsName,
					businessUnit,
					metadataType: "dataExtension",
					metadataSubKey: "name",
					filename: name
				};
				const success = await deps.executeCommand("retrieve", { filesDetails: [fileDetail] });
				if (success) {
					sqlDiagnosticProvider.clearCache();
					const doc = VSCode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
					if (doc) {
						sqlDiagnosticProvider.validateDocument(doc).catch(err => {
							console.error(
								"[sfmc-devtools-vscode] SqlDiagnosticProvider post-retrieve validation failed:",
								err
							);
						});
					}
				}
			}
		)
	);

	// ── SSJS / AMPscript diagnostic + quick-fix providers ──
	// Providers are always registered; validation is gated at runtime by the
	// warnOnMissingScriptDataExtension setting.

	const scriptDiagnosticProvider = new ScriptDiagnosticProvider();
	vscodeContext.registerDisposable(scriptDiagnosticProvider.getDiagnosticCollection());

	if (workspaceUri) {
		const scriptDeWatcher = VSCode.workspace.createFileSystemWatcher(
			new VSCode.RelativePattern(workspaceUri, "**/retrieve/**/dataExtension/*.dataExtension-meta.json")
		);
		const revalidateOpenScriptDocs = () => {
			scriptDeProvider.clearCache();
			scriptDiagnosticProvider.clearCache();
			if (isEnabled("warnOnMissingScriptDataExtension")) {
				VSCode.workspace.textDocuments.forEach(doc => {
					scriptDiagnosticProvider.validateDocument(doc).catch(err => {
						console.error(
							"[sfmc-devtools-vscode] ScriptDiagnosticProvider DE-change revalidation failed:",
							err
						);
					});
				});
			}
		};
		scriptDeWatcher.onDidCreate(revalidateOpenScriptDocs);
		scriptDeWatcher.onDidDelete(revalidateOpenScriptDocs);
		scriptDeWatcher.onDidChange(revalidateOpenScriptDocs);
		vscodeContext.registerDisposable(scriptDeWatcher);
	}

	if (isEnabled("warnOnMissingScriptDataExtension")) {
		VSCode.workspace.textDocuments.forEach(doc => {
			scriptDiagnosticProvider.validateDocument(doc).catch(err => {
				console.error("[sfmc-devtools-vscode] ScriptDiagnosticProvider init validation failed:", err);
			});
		});
	}

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidOpenTextDocument(doc => {
			if (!isEnabled("warnOnMissingScriptDataExtension")) {
				scriptDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			deps.tooltipProvider.setCacheLoading("scriptDataExtensions");
			scriptDiagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] ScriptDiagnosticProvider open validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("scriptDataExtensions");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidSaveTextDocument(doc => {
			if (!isEnabled("warnOnMissingScriptDataExtension")) {
				scriptDiagnosticProvider.getDiagnosticCollection().delete(doc.uri);
				return;
			}
			deps.tooltipProvider.setCacheLoading("scriptDataExtensions");
			scriptDiagnosticProvider
				.validateDocument(doc)
				.catch(err => {
					console.error("[sfmc-devtools-vscode] ScriptDiagnosticProvider save validation failed:", err);
				})
				.finally(() => {
					deps.tooltipProvider.setCacheDone("scriptDataExtensions");
				});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidChangeTextDocument(event => {
			if (!isEnabled("warnOnMissingScriptDataExtension")) {
				scriptDiagnosticProvider.getDiagnosticCollection().delete(event.document.uri);
				return;
			}
			scriptDiagnosticProvider.validateDocument(event.document).catch(err => {
				console.error("[sfmc-devtools-vscode] ScriptDiagnosticProvider change validation failed:", err);
			});
		})
	);

	vscodeContext.registerDisposable(
		VSCode.workspace.onDidCloseTextDocument(doc => {
			scriptDiagnosticProvider.clearDocument(doc.uri);
		})
	);

	vscodeContext.registerDisposable(
		VSCode.languages.registerCodeActionsProvider({ scheme: "file" }, new ScriptCodeActionProvider(), {
			providedCodeActionKinds: [VSCode.CodeActionKind.QuickFix]
		})
	);

	vscodeContext.registerDisposable(
		VSCode.commands.registerCommand(
			RETRIEVE_SCRIPT_DE_COMMAND,
			async ({ projectPath, credBu, name, documentUri }: IRetrieveScriptDataExtensionArgs) => {
				const [credentialsName, businessUnit] = credBu.split("/");
				const fileDetail: TDevTools.IExecuteFileDetails = {
					level: "file",
					projectPath,
					topFolder: "/retrieve/",
					path: `${projectPath}/retrieve/${credBu}/dataExtension/`,
					credentialsName,
					businessUnit,
					metadataType: "dataExtension",
					metadataSubKey: "name",
					filename: name
				};
				const success = await deps.executeCommand("retrieve", { filesDetails: [fileDetail] });
				if (success) {
					scriptDeProvider.clearCache();
					scriptDiagnosticProvider.clearCache();
					const doc = VSCode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
					if (doc) {
						scriptDiagnosticProvider.validateDocument(doc).catch(err => {
							console.error(
								"[sfmc-devtools-vscode] ScriptDiagnosticProvider post-retrieve validation failed:",
								err
							);
						});
					}
				}
			}
		)
	);
}
