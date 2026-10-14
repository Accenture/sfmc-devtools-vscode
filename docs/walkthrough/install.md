## Check Node/npm and mcdev source

mcdev 10.1.0 (with sfmc-sdk 4.0.2) is bundled with this extension. You do not need a global or project-local mcdev installation for extension commands.

Install a supported Node.js release with npm and put both `node` and `npm` on PATH. Bundled mcdev 10 requires Node `^22.22.2 || >=24.15.0`. Restart VS Code/Cursor after installing or changing PATH, then check `node --version` and `npm --version` in a new terminal.

In Settings, `sfmc-devtools-vscode.mcdevSource` defaults to `auto`: project-local mcdev, then PATH, then bundled. Choose `bundled` to force the extension copy, or `custom` with `sfmc-devtools-vscode.mcdevPath` for an executable path without arguments or shell quotes (relative paths use the project root). Explicit selections never fall back; bundled updates arrive with extension updates.

Git is optional for ordinary commands. Without Git, init/upgrade warn and skip Git steps; join and Git-backed delta packages require it.

The bundled copy does not put a standalone `mcdev` command on PATH. Install a separate CLI only if you want to type `mcdev` directly in a terminal. See the extension README for setup and fresh-project limitations.
