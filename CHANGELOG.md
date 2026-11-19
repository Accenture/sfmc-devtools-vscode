# Changelog

All notable changes to the **SFMC DevTools** VS Code extension are documented in [GitHub Releases](https://github.com/Accenture/sfmc-devtools-vscode/releases).

Publishing is triggered automatically via GitHub Actions when a new release is created.

## [3.8.0] — 2026-11-19

### Added

- The bundled mcdev runtime is now **mcdev 10.3.0** (sfmc-sdk stays at 4.0.2).
- **Transactional push messages can be deployed across business units** (mcdev 10.3.0): a `transactionalPush` file now references its MobilePush application as `r__mobilePushApp_key` and `r__mobilePushApp_name` instead of storing `applicationId`, like `mobilePush` and journey activities. On deploy the key is tried first and the name is used when the key does not exist on the target BU. Files that still carry a plain `applicationId` are deployed unchanged.

### Changed

- **MobilePush applications are identified by their ID** (mcdev 10.3.0), the value the Marketing Cloud GUI shows, instead of an encoded text that appeared nowhere in the GUI. `mobilePushApp` files are named by ID, and `r__mobilePushApp_key` in `mobilePush`, `journey` and `transactionalPush` holds that ID.
- **What to do once:** re-retrieve `journey`, `mobilePush`, `transactionalPush` and `mobilePushApp` on every branch you keep, and commit the result. This rewrites the references and replaces the application files, including their names. Nothing breaks if you deploy first: references in the old form are still understood on deploy. Details are in the mcdev wiki under [Updating mcdev](https://github.com/Accenture/sfmc-devtools/wiki/03.-Updating-mcdev).

### Fixed

- `r__asset_key` relations to mobile assets stored in their own subfolder (`asset/mobile/<key>/<key>.asset-mobile-meta.json`) now get a link and are no longer reported as "was not found on the BU". Mobile assets stored directly in `asset/mobile/` keep working.
- Relation links such as `r__mobilePushApp_key` now appear after the referenced item is retrieved, the next time the file is edited or brought back into view. Before, a relation whose target was missing when the file was first opened stayed without a link until the window was reloaded.

### Dependencies

- Bump bundled `mcdev` from 10.2.0 to 10.3.0.

## [3.7.0] — 2026-11-16

### Added

- The bundled mcdev runtime is now **mcdev 10.2.0** (sfmc-sdk stays at 4.0.2; mcdev 10.1.1 was an intermediate release). Besides the items below, this also upgrades the bundled formatter to Prettier 3.10.1 and `prettier-plugin-sfmc` 2.2.1, so retrieve and deploy no longer corrupt code placed next to personalization strings or AMPscript inside `<script>` strings.
- **Data Designer Attribute Groups** and **Attribute Sets** can now be created, updated, deleted and built as templates (mcdev 10.2.0), so the matching **Deploy**, **Delete** and **Build** actions are available for them instead of only retrieve.

### Changed

- Multi-step journeys no longer cause the `mobilePush` and `mobileMessage` items that Journey Builder creates for them on publish to be retrieved or deployed; they are skipped and the journey keeps referencing them (mcdev 10.2.0).
- The built-in metadata type list now matches mcdev 10.2.0 for the default Content Builder asset subtypes retrieved with `asset`, the attribute types above and the `dataFilter` description, until **mcdev: Refresh caches (reload metadata types)** loads the live list.

### Fixed

- Deploying journey folders no longer fails with `API Permission Failed (Code 7)`: updating journey, automation and triggered send journeybuilder folders is skipped (mcdev 10.2.0).
- After upgrading a pre-v10 project, mcdev can offer an optional asset-migration hand-off; unattended upgrades only warn (mcdev 10.1.1).
- Data Extension repair selection and the `--purge` / `--no-purge` flags now behave correctly for build and clone commands, and the initial Git setup pushes the current branch instead of assuming `master` (mcdev 10.1.1).

### Dependencies

- Bump bundled `mcdev` from 10.1.0 to 10.2.0 (adopts `prettier-plugin-sfmc` 2.2.1 and `eslint-plugin-sfmc` 5.3.0).
- Bump build-time `prettier` from 3.9.9 to 3.10.1 to match mcdev.

## [3.6.1] — 2026-11-13

### Fixed

- Upgrade-required failures now show the affected project config version and the actual mcdev CLI version, and retain that runtime for the confirmed upgrade even if source settings change.
- **Run mcdev upgrade** requires explicit per-project confirmation and runs non-interactively with `--yes` (equivalent `--y`). Confirmation and failure messaging explain project/tooling changes and manual Git-only recovery; no rollback or automatic retry is offered.
- Upgrade guidance is recognized across split stdout/stderr chunks without mixing streams or prompting recursively after an upgrade failure.
- **mcdev: Refresh caches (reload metadata types)** (formerly "Restart extension") now reloads the metadata types from `mcdev explainTypes`, clears the cached per-project configured types and refreshes the tree view. Failures (resolver errors, CLI errors, unparsable output, a 60 s timeout) are logged and shown instead of being silently ignored, and banner lines before the JSON no longer break parsing.
- `explainTypes` refreshes no longer drop the extension-defined `retrieveAsTemplate` flag, and new CLI types get explicit `false` lifecycle flags.
- Added `mobilePush` and `mobilePushApp` to the bundled metadata types so **Build** is available for MobileConnect Push before the CLI refresh completes.

## [3.6.0] — 2026-10-15

### Added

- Explicit mcdev project-upgrade guidance now offers a targeted **Upgrade** action and **More Details**, without automatic retries.
- Anonymous source-mode telemetry records only `auto`, `bundled`, or `custom` at activation and on actual configuration changes, including without an open project.

- Bundled mcdev fallback with `sfmc-devtools-vscode.mcdevSource`: default `auto` selects project-local, PATH, then bundled mcdev; explicit `bundled` and `custom` selections never fall back. `mcdevPath` configures the custom executable.
- Relocatable runtime packaging from published mcdev 10.1.0, with registry/lockfile provenance, per-file hashes and offline VSIX smoke coverage. The bundled SDK is 4.0.2, including its supported-scope provider; Node `^22.22.2 || >=24.15.0` is required.
- Build-time Prettier is aligned to mcdev's 3.9.9 so the packaged formatter and its plugin use the same version.

### Changed

- A separate global mcdev installation is no longer required for extension commands. Compatible Node/npm on PATH remain required; bundled mcdev updates with the extension.
- All extension CLI invocations, including interactive setup and metadata discovery, use the selected runtime. Failed commands are not retried through another source.
- Bundled mcdev preserves its active CLI for recursive setup/upgrade calls and resolves its canonical formatter plugin from its own package. Missing Git warns and skips Git steps during init/upgrade; join and Git-backed delta packages require Git.
- README and walkthrough setup guidance now explain source settings, runtime prerequisites and the unchanged fresh-project command-visibility limitation.

## [3.5.0] — 2026-09-09

### Changed

- **Extension-presence telemetry** now includes presence-only booleans for `xnerd.ampscript-language`, `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, and `MarketingThibs.ampscriptsnippets`, alongside the existing Markdown Preview signal. Presence reflects the current extension host, not activation or usage.

## [3.4.3] — 2026-09-08

### Fixed

- **JSON asset relations**: `r__asset_key` links and missing-reference checks now fall back to flat mobile metadata and flat or nested webstudio metadata in the same BU, after the existing context-specific template/message lookup.

## [3.4.2] — 2026-08-25

### Changed

- **Build tooling migrated from webpack to esbuild.** The extension is now bundled with esbuild (matching the other SFMC VS Code extensions), replacing webpack + `ts-loader`. Type-checking runs as a dedicated `tsc --noEmit` step (`lint-ts`) wired into the pre-commit hook and CI, since esbuild does not type-check. No runtime behavior changes — the shipped bundle (`dist/extension.bundle.js`) and extension functionality are unchanged.

## [3.4.1] — 2026-08-23

### Changed

- **`command.failed` telemetry** now optionally includes sanitized `errorName` / `errorCode` when `executeMcdev` throws (`errorCategory: unknown`). Successful `{success:false}` results still send only `commandFailed`. Never a raw message, stack, or path.

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
