# Changelog

All notable changes to the **SFMC DevTools** VS Code extension are documented in [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).

Publishing is triggered automatically via GitHub Actions when a new release is created.

## [3.1.1] — 2026-04-08

### Fixed

- **Build (Template + Definition)**: the command now asks whether to clear the deploy folder before building and passes `--purge` or `--no-purge` to mcdev so the CLI no longer waits indefinitely on an interactive prompt in the VS Code terminal.

## [3.1.0] — 2026-04-08

### Added

- **What's New**: after an update, a notification offers to open in-editor release notes (parsed from this changelog). Command: **SFMC DevTools: Show What's New**. Full histories remain on [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).

## [3.0.0] — 2026-04-08

### Changed

- Release notes: use **SFMC DevTools: Show What's New** in the Command Palette, or respond to the notification after an update, to open in-editor notes parsed from this changelog. For full details, see [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).
