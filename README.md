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

### Copyright

Copyright (c) 2026 Accenture. [MIT licensed](https://github.com/Accenture/sfmc-devtools-vscode/blob/main/LICENSE).
