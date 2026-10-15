# **SFMC DevTools** | Visual Studio Code Extension

Accenture SFMC DevTools VS Code Extension was built to simplify the command execution for [Accenture SFMC DevTools](https://github.com/Accenture/sfmc-devtools), offering a more intuitive interface that streamlines the process of retrieving and deploying Marketing Cloud assets, configuration and code across various Business Units and instances. This tool eliminates the necessity of manual command line input (CLI), making your workflow more efficient and user-friendly.

### Prerequisites

- Install a currently supported [Node.js](https://nodejs.org/en) release with npm, and make both `node` and `npm` available on PATH to VS Code/Cursor and its terminals. The bundled mcdev 10 runtime requires `^22.22.2 || >=24.15.0`: Node 22.22.2+ within Node 22, or Node 24.15.0+. Node 20, 21, 23 and earlier Node 22/24 patches are unsupported.
- Restart the IDE after installing Node/npm or changing PATH; an already running IDE retains its old environment.
- [Git](https://git-scm.com/downloads) is optional for ordinary retrieve/deploy and project setup. Without Git, `init` and `upgrade` warn and skip Git steps while continuing non-Git setup. Joining a repository and Git-backed delta packages require Git and fail with an actionable error when it is unavailable. Existing Git failures are not treated as successful setup.

For Windows setup without administrator rights, see [Troubleshooting: portable Node/npm](#windows-portable-nodenpm-without-administrator-rights).

### Choose the mcdev CLI source

The extension ships the published **mcdev 10.1.0** runtime with **sfmc-sdk 4.0.2**: **no global or project-local mcdev installation is required**. In Settings, configure:

- `sfmc-devtools-vscode.mcdevSource`: `auto` (default) selects project-local mcdev first, then mcdev on PATH, then the bundled runtime. `bundled` always uses the extension's copy. `custom` always uses the executable named by `mcdevPath`.
- `sfmc-devtools-vscode.mcdevPath`: executable path for `custom`; relative paths resolve from the project root. Supply only the path, without arguments or shell quotes. Windows `.cmd` launchers are supported.

Explicit `bundled`/`custom` choices never silently fall back. A failed operation is not retried with another CLI version. Source changes apply to subsequent invocations; the mcdev Output channel reports the selected source/version for diagnostics. Bundled mcdev updates arrive with **extension updates**, not through a global npm update. A project-version mismatch may require updating the extension or deliberately selecting a compatible local/custom CLI before upgrading the project.

When mcdev explicitly recommends a project upgrade, the completion notification offers **Upgrade** and **More Details**. Upgrade runs `mcdev upgrade` for the affected project using the configured CLI source. Dismissing it does nothing; the original operation is never automatically retried. Review project changes after upgrading.

If you prefer a separately installed CLI (including typing `mcdev` directly in a terminal), install it globally with `npm install -g mcdev`, or use a project-local installation. The bundled copy does not add a `mcdev` command to PATH.

### Install SFMC DevTools VS Code Extension

- In Visual Studio Code, navigate to the Extensions tab (or click `Ctrl + Shift + X`
- Search for `SFMC DevTools` and click on `Install`
- After installation is completed click on the button `Reload Required` or simply reopen your Visual Studio Code
- A `mcddev` button should display at the bottom bar

### Companion extensions

Installing SFMC DevTools automatically brings along a small set of companion extensions that make working with `mcdev` projects much smoother. One of them is **required** (it installs automatically and stays for as long as DevTools is installed) because DevTools relies on it to be usable:

- **[SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language)** (required) - **so your code is readable and gets linted/formatted.** DevTools retrieves and deploys `.ssjs` and `.amp` files, but VS Code has no built-in support for AMPscript or SSJS. Without this extension those files are plain, uncolored text with no completions, hover docs, or diagnostics - and the ESLint/Prettier tooling `mcdev` sets up has nothing to hook into. It provides the syntax highlighting, IntelliSense, and language server that make the retrieved code readable and lintable.

The following soft companions ship as a pack and can each be removed individually if you do not want them:

- **[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)** and **[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)** - the `mcdev` CLI scaffolds ESLint and Prettier configs into your project, so these are advisable to have installed.
- **[SFMC Data Loader](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-data)** - companion `mcdev` tooling for loading and manipulating Data Extension records, so you can move data alongside the metadata DevTools retrieves and deploys.

**Readable `mcdev` logs are now built in.** DevTools streams the `mcdev` CLI output into the VS Code **Output** panel, which has no syntax coloring of its own. DevTools now colorizes its own "mcdev" Output channel internally via an embedded `mcdev-log` grammar, so success, warning, and error lines are distinguishable at a glance. Because this is built in, the third-party [Output Colorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer) extension is no longer a required companion.

Why bundle these? The SFMC extension packs are optional and do not assume you use `mcdev`. Developers who **do** use `mcdev` often skip the packs - this minimal set makes sure they still get the crucial language service (readable, lintable code) and the linting/formatting and data-loading tooling `mcdev` expects, while the Output panel is colorized by DevTools itself.

For a fuller toolchain (SFMC Data Loader, MSO Conditionals, EditorConfig, Peacock), install one of our extension packs:

- **[SFMC Extension Pack](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack)** - SFMC Data Loader, SFMC DevTools, SFMC Language Service, and MSO Conditionals.
- **[SFMC Extension Pack Plus](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack-expanded)** - the same four SFMC extensions plus ESLint, Prettier, and EditorConfig for a typical SFMC project toolchain.

New `mcdev init` projects also ship a `.vscode/extensions.json` file, so VS Code will surface these companions through its built-in **Recommended Extensions** prompt when you open a DevTools project.

### Initialize SFMC DevTools Project

If you are starting a completely new SFMC DevTools project

- Use **mcdev: Initialize Project** when the command is available in your open mcdev project; it uses the selected CLI source in an integrated terminal.
- Command visibility still depends on existing project detection; this feature does not redesign fresh-folder or multi-root discovery. For a completely fresh folder where the command is unavailable, use a separately installed CLI and run `mcdev init` in that folder. The bundled fallback does not expose a standalone `mcdev` terminal command.
- Follow the interactive instructions. Without Git, setup warns and skips repository/remotes/commit/push steps. For more guidance, consult the [SFMC DevTools init documentation](https://github.com/Accenture/sfmc-devtools/wiki/06.a-~-Admin-Commands#init).

### Wiki

Consult the [Wiki](https://github.com/Accenture/sfmc-devtools-vscode/wiki) for a complete guide on how to use the SFMC DevTools Vscode Extension.

### AI assistants (optional MCP)

For **mcdev** project help (wiki search, `.mcdevrc` concepts such as markets and `marketList`, `createDeltaPkg`, journey checklists, metadata type listing), you can add the community MCP server **[mcp-server-mcdev](https://www.npmjs.com/package/mcp-server-mcdev)** to your editor’s MCP configuration. It is published to the [MCP Registry](https://registry.modelcontextprotocol.io) as **`io.github.JoernBerkefeld/mcp-server-mcdev`** and runs locally via `npx` (see that package’s README). It complements language-focused tooling such as **[mcp-server-sfmc](https://www.npmjs.com/package/mcp-server-sfmc)** for AMPscript and SSJS.

Example `.vscode/mcp.json`:

```json
{
	"servers": {
		"mcdev": {
			"type": "stdio",
			"command": "npx",
			"args": ["-y", "mcp-server-mcdev@latest"]
		}
	}
}
```

### Features

- Retrieve and Deploy Marketing Cloud assets by right clicking on the file in the File Explorer and selecting the command option
- Retrieve and Deploy **multiple** Marketing Cloud assets from multiple metadata types at the same time from the same and different business unit
- Retrieve and Deploy Marketing Cloud assets by right clicking on the file tab and selecting the command option
- Deploy Marketing Cloud assets directly from the retrieve folder
- Copy multiple Marketing Cloud assets from one business unit to another
- Deploy multiple Marketing Cloud assets from one business unit to another
- Navigate JSON `r__asset_key` references to local metadata in the same BU. References inside asset folders prefer nested template metadata; other references prefer nested message metadata. Both then try flat mobile, flat webstudio, and nested webstudio metadata, in that order. Missing-reference warnings use the same lookup order.

### Telemetry

This extension collects a small amount of **anonymous** usage telemetry to understand adoption and reliability. It **never** collects personal data, file contents, credentials, or Business Unit / tenant identifiers.

What is collected:

- **Activation** — that the extension started, whether an mcdev project is open, which related SFMC extensions are co-installed (presence booleans), and the configured `mcdevSource` mode (`auto`, `bundled`, or `custom`).
- **Source changes** — only actual changes to that configured mode, including when no mcdev project is open. Custom executable paths and resolved runtime paths are never collected.
- **mcdev version** — the installed `mcdev` CLI version and this extension's own version.
- **Command outcomes** — for mcdev-run commands (e.g. retrieve, deploy, build): the command id, its duration, and success/failure (a coarse `errorCategory`, plus optional sanitized `errorName` / `errorCode` when execute throws — never an error message, stack, or path).

Every event also carries the host OS, the VS Code version, and this extension's version. Events are sent to **PostHog (EU cloud)**. The full event catalog ships in [`telemetry.json`](./telemetry.json) and is visible via the VS Code CLI `--telemetry` dump.

**Opt out:** telemetry follows VS Code's global setting. Set `telemetry.telemetryLevel` to `off` (Settings → search "telemetry") and no events are sent. The extension re-checks this setting live, so turning it off stops collection immediately.

### Troubleshooting

#### Windows: portable Node/npm without administrator rights

The extension does not download or provision Node. You can use a portable Node/npm installation without administrator rights by adding it to **your user-scoped PATH**:

1. Download the official Node.js Windows portable ZIP for your architecture. Choose a currently supported release satisfying `^22.22.2 || >=24.15.0`: Node 22.22.2+ within Node 22, or Node 24.15.0+. Use the distribution that includes npm, not a standalone `node.exe` download.
2. Extract the ZIP into a folder you can write to, and confirm that the extracted Node directory contains both `node.exe` and `npm.cmd`.
3. Open Start, search for **Edit environment variables for your account**, and open that settings entry.
4. Under **User variables**, select **Path**, choose **Edit**, then **New**, and add the full path to the extracted directory containing `node.exe` and `npm.cmd`. Save with **OK** in each dialog. You do not need administrator rights or changes to the system PATH.
5. Fully close and restart VS Code/Cursor so it picks up the updated environment.
6. Open a new IDE terminal and run `node --version` and `npm --version`. Both commands should succeed, and the Node version must satisfy the requirement above.

### Building locally

From the extension directory, run `npm ci`, then `npm run compile` (or `npm run package:test` for a VSIX). The build stages the exact registry-locked mcdev 10.1.0 package and its runtime dependencies. No sibling source checkout or source-selection environment variable is needed.

The staged runtime under `dist/mcdev` records the extension lockfile digest, package versions, registry URLs/integrities and per-file hashes in `bundle-metadata.json`. `npm run verify:vsix -- sfmc-devtools-vscode-BETA.vsix` checks the packaged runtime after extraction/relocation and runs offline smoke tests. Archive timestamps can change the VSIX hash; byte-identical archive reproducibility is not claimed.

### Copyright

Copyright (c) 2026 Accenture. [MIT licensed](https://github.com/Accenture/sfmc-devtools-vscode/blob/main/LICENSE).
