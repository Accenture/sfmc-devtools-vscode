# Changelog

All notable changes to the **SFMC DevTools** VS Code extension are documented in [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).

Publishing is triggered automatically via GitHub Actions when a new release is created.

## [3.4.0] — 2026-08-22

### Added

- **Anonymous usage telemetry**: the extension now sends a small amount of anonymous telemetry (activation, installed `mcdev` version, and mcdev-run command outcomes with durations) to PostHog (EU cloud) to gauge adoption and reliability. No personal data, file contents, credentials, or BU/tenant identifiers are collected. It follows VS Code's global `telemetry.telemetryLevel` setting — set it to `off` to opt out. The full event catalog ships in [`telemetry.json`](./telemetry.json).

## [3.3.0] — 2026-08-19

### Added

- **Built-in Output-panel colorizer**: DevTools now embeds its own log colorizer — an `mcdev-log` [TextMate grammar](./syntaxes/mcdev-log.tmLanguage) tuned to `mcdev`'s log format — scoped to only the DevTools "mcdev" Output channel. Errors, warnings, and progress are distinguishable at a glance without any third-party extension. As a result, the previously-required [Output Colorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer) is no longer needed.
- **Auto-installed companion extensions**: DevTools declares a minimal set of companion extensions that install alongside it, so `mcdev` users who do not install the separate SFMC extension packs still get a good editing experience:
  - **Hard dependency** (`extensionDependencies`, installed automatically and cannot be removed without removing DevTools):
    - [SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) — **so your code is readable and gets linted/formatted.** VS Code has no built-in AMPscript/SSJS support, so the `.ssjs` / `.amp` files DevTools retrieves would otherwise be uncolored plain text with no completions, hover docs, or diagnostics — and the ESLint/Prettier configs `mcdev` scaffolds would have nothing to hook into.
  - **Soft companions** (`extensionPack`, installed automatically but individually removable):
    - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — the `mcdev` CLI scaffolds ESLint/Prettier configs into projects, so these are advisable to have installed.
    - [SFMC Data Loader](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-data) — companion `mcdev` tooling for loading and manipulating Data Extension records alongside the metadata DevTools retrieves and deploys.
- This partially reverses the standalone-extension decision from 3.2.0 by design. EditorConfig is intentionally not included and remains available through the SFMC extension packs.

### Removed

- **`IBM.output-colorizer` is no longer an `extensionDependency`**: Output-panel coloring is now built into DevTools via the embedded `mcdev-log` grammar, so the third-party colorizer is no longer installed as a hard dependency.
- **Custom "recommended extensions" popup**: the extension no longer shows its own modal prompting to install companion extensions, and the accompanying `sfmc-devtools-vscode.recommendExtensions` setting has been removed. Companion extensions are now offered through the [SFMC extension packs](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack) and, per project, through VS Code's built-in Recommended Extensions prompt driven by the `mcdev` boilerplate `.vscode/extensions.json`.

### Attribution

- The embedded `mcdev-log` grammar is adapted from IBM's [vscode-log-output-colorizer](https://github.com/IBM/vscode-log-output-colorizer) (MIT) — see [NOTICE.md](https://github.com/Accenture/sfmc-devtools-vscode/blob/main/NOTICE.md).

## [3.2.0] — 2026-06-26

### Removed

- **Bundled extension pack**: the extension no longer auto-installs ESLint, EditorConfig, Prettier, SFMC Language Service, and SFMC Data Loader. It is now a standalone extension.

### Changed

- **README**: added a "Recommended companion extensions" section pointing to the [SFMC Extension Pack](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack) and [SFMC Extension Pack Plus](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack-expanded), and strongly recommending at least the [SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) extension.

## [3.1.3] — 2026-06-26

### Fixed

- **Cursor compatibility**: lowered the required `engines.vscode` from `^1.109.0` back to `^1.101.0` so the extension installs in Cursor (whose bundled VS Code base lags upstream). The `1.109` floor made the extension uninstallable in Cursor with an "is not compatible" error.

## [3.1.2] — 2026-04-09

### Changed

- **Build (Template + Definition)**: the two Business Unit quick-picks now say **source** vs **target** so it is clear which selection maps to `--buFrom` and which to `--buTo`.

## [3.1.1] — 2026-04-08

### Fixed

- **Build (Template + Definition)**: the command now asks whether to clear the deploy folder before building and passes `--purge` or `--no-purge` to mcdev so the CLI no longer waits indefinitely on an interactive prompt in the VS Code terminal.

## [3.1.0] — 2026-04-08

### Added

- **What's New**: after an update, a notification offers to open in-editor release notes (parsed from this changelog). Command: **SFMC DevTools: Show What's New**. Full histories remain on [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).

## [3.0.0] — 2026-04-08

### Changed

- Release notes: use **SFMC DevTools: Show What's New** in the Command Palette, or respond to the notification after an update, to open in-editor notes parsed from this changelog. For full details, see [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).
