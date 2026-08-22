# **SFMC DevTools** | Visual Studio Code Extension

Accenture SFMC DevTools VS Code Extension was built to simplify the command execution for [Accenture SFMC DevTools](https://github.com/Accenture/sfmc-devtools), offering a more intuitive interface that streamlines the process of retrieving and deploying Marketing Cloud assets, configuration and code across various Business Units and instances. This tool eliminates the necessity of manual command line input (CLI), making your workflow more efficient and user-friendly.

### Pre Requisites

- Install [Node.js](https://nodejs.org/en)
- Install [Git](https://git-scm.com/downloads)
- Install [Accenture SFMC DevTools](https://github.com/Accenture/sfmc-devtools)

### Install Accenture SFMC DevTools

```bash
npm install -g mcdev
```

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

- Go to Terminal and click on New Terminal
- Enter the command `mcdev init` and follow the interactive instructions to initialize a new project. For more guidance, consult the official SFMC DevTools documentation [here](https://github.com/Accenture/sfmc-devtools/wiki/06.a-~-Admin-Commands#init)

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

### Telemetry

This extension collects a small amount of **anonymous** usage telemetry to understand adoption and reliability. It **never** collects personal data, file contents, credentials, or Business Unit / tenant identifiers.

What is collected:

- **Activation** — that the extension started, whether an mcdev project is open, and which related SFMC extensions are co-installed (booleans only).
- **mcdev version** — the installed `mcdev` CLI version and this extension's own version.
- **Command outcomes** — for mcdev-run commands (e.g. retrieve, deploy, build): the command id, its duration, and success/failure (a coarse category only — never an error message or stack).

Every event also carries the host OS, the VS Code version, and this extension's version. Events are sent to **PostHog (EU cloud)**. The full event catalog ships in [`telemetry.json`](./telemetry.json) and is visible via the VS Code CLI `--telemetry` dump.

**Opt out:** telemetry follows VS Code's global setting. Set `telemetry.telemetryLevel` to `off` (Settings → search "telemetry") and no events are sent. The extension re-checks this setting live, so turning it off stops collection immediately.

### Copyright

Copyright (c) 2026 Accenture. [MIT licensed](https://github.com/Accenture/sfmc-devtools-vscode/blob/main/LICENSE).
