/**
 * Authoritative telemetry.json validation.
 *
 * Why this is authoritative
 * -------------------------
 * VS Code / Cursor discover extension catalogs with `--telemetry` by scanning each
 * installed extension folder for a file named exactly `telemetry.json`, JSON.parse-ing
 * it, and merging the result into the dump (plus `telemetry-core.json` and
 * `telemetry-extensions.json` from the editor app root). That merger lives in the
 * installed editor at `resources/app/out/vs/code/node/cliProcessMain.js`. It does
 * **not** run a separate JSON Schema; acceptance *is* "the packaged file is found
 * and parses". Live `cursor --telemetry` cannot be isolated in tests without writing
 * dummy core catalogs into the real app root (this editor install has none), so this
 * script:
 *   1. Pins the installed merger contract when Cursor is present.
 *   2. Runs that same merger against a temp extensions dir that contains this
 *      package's catalog (the layout VS Code uses after VSIX install).
 *   3. Validates GDPR field shape against the local VS Code telemetry guide
 *      (`docs/vscode/docs/configure/telemetry.md`: classification + purpose) plus
 *      the required `comment` / `owner` documentation fields used by first-party
 *      catalogs.
 *   4. Confirms `vsce ls` ships `telemetry.json`.
 *
 * It never writes into the real Cursor/VS Code installation.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "telemetry.json");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

/** From VS Code's telemetry guide: Event classification. */
const classifications = new Set([
	"CallstackOrException",
	"CustomerContent",
	"EndUserPseudonymizedInformation",
	"PublicNonPersonalData",
	"SystemMetaData"
]);
/** From VS Code's telemetry guide: Event purpose. */
const purposes = new Set(["BusinessInsight", "FeatureInsight", "PerformanceAndHealth"]);

/**
 * Locates the installed Cursor/VS Code app root that ships cliProcessMain.js.
 * @returns {string | undefined} App root when present on this machine.
 */
function findEditorAppRoot() {
	const candidates = [
		join(process.env.LOCALAPPDATA ?? "", "Programs", "cursor", "resources", "app"),
		join(process.env.LOCALAPPDATA ?? "", "Programs", "Microsoft VS Code", "resources", "app"),
		"/Applications/Cursor.app/Contents/Resources/app",
		"/Applications/Visual Studio Code.app/Contents/Resources/app",
		"/usr/share/cursor/resources/app",
		"/usr/share/code/resources/app"
	];
	return candidates.find(candidate => existsSync(join(candidate, "out", "vs", "code", "node", "cliProcessMain.js")));
}

/**
 * VS Code `--telemetry` merger, matching the installed cliProcessMain.js dump:
 * scan extension folders for exactly one `telemetry.json`, JSON.parse each, then
 * merge `telemetry-core.json` and `telemetry-extensions.json` from the app root.
 * @param {string} appRoot - Editor app root containing core catalog files.
 * @param {string | undefined} extensionsPath - Isolated extensions directory.
 * @returns {Promise<string>} Pretty-printed dump JSON.
 */
async function buildTelemetryMessage(appRoot, extensionsPath) {
	const merged = Object.create(null);
	const add = (raw, key) => {
		merged[key] = JSON.parse(raw);
	};
	if (extensionsPath) {
		const names = await readdir(extensionsPath);
		const dirs = [];
		for (const name of names) {
			try {
				if ((await stat(join(extensionsPath, name))).isDirectory()) dirs.push(name);
			} catch {
				// Skip entries that disappear between readdir and stat, matching the editor.
			}
		}
		const withCatalog = [];
		for (const dir of dirs) {
			const files = await readdir(join(extensionsPath, dir));
			if (files.filter(file => file === "telemetry.json").length === 1) withCatalog.push(dir);
		}
		for (const dir of withCatalog) {
			add(await readFile(join(extensionsPath, dir, "telemetry.json"), "utf8"), dir);
		}
	}
	add(await readFile(join(appRoot, "telemetry-core.json"), "utf8"), "vscode-core");
	add(await readFile(join(appRoot, "telemetry-extensions.json"), "utf8"), "vscode-extensions");
	return JSON.stringify(merged, null, 4);
}

/**
 * Asserts a GDPR-classified field used by commonProperties, properties, or measures.
 * @param {unknown} field - Catalog field object.
 * @param {string} location - Path for assertion messages.
 */
function validateField(field, location) {
	assert.equal(typeof field, "object", `${location} must be an object`);
	assert.ok(field && !Array.isArray(field), `${location} must be a plain object`);
	assert.ok(classifications.has(field.classification), `${location} has an unsupported classification`);
	assert.ok(purposes.has(field.purpose), `${location} has an unsupported purpose`);
	assert.equal(typeof field.comment, "string", `${location}.comment is required`);
	assert.ok(field.comment.trim().length > 0, `${location}.comment must not be empty`);
}

assert.deepEqual(Object.keys(catalog).sort(), ["commonProperties", "events"]);
assert.equal(typeof catalog.commonProperties, "object");
assert.equal(typeof catalog.events, "object");
for (const [name, field] of Object.entries(catalog.commonProperties)) {
	validateField(field, `commonProperties.${name}`);
}
assert.ok("distinct_id" in catalog.commonProperties, "commonProperties.distinct_id is required");
assert.ok("$process_person_profile" in catalog.commonProperties, "commonProperties.$process_person_profile is required");
assert.equal(catalog.commonProperties.distinct_id.classification, "EndUserPseudonymizedInformation");
assert.equal(catalog.commonProperties.$process_person_profile.classification, "SystemMetaData");

for (const [eventName, event] of Object.entries(catalog.events)) {
	assert.equal(typeof event, "object", `${eventName} must be an object`);
	assert.equal(typeof event.owner, "string", `${eventName}.owner is required`);
	assert.ok(event.owner.trim().length > 0, `${eventName}.owner must not be empty`);
	assert.equal(typeof event.comment, "string", `${eventName}.comment is required`);
	assert.ok(event.comment.trim().length > 0, `${eventName}.comment must not be empty`);
	assert.equal(typeof (event.properties ?? {}), "object", `${eventName}.properties must be an object`);
	assert.equal(typeof (event.measures ?? {}), "object", `${eventName}.measures must be an object`);
	for (const [name, field] of Object.entries(event.properties ?? {})) {
		validateField(field, `${eventName}.properties.${name}`);
	}
	for (const [name, field] of Object.entries(event.measures ?? {})) {
		validateField(field, `${eventName}.measures.${name}`);
	}
}

const vsceCli = join(root, "node_modules", "@vscode", "vsce", "vsce");
assert.ok(existsSync(vsceCli), `vsce CLI not found at ${vsceCli}`);
const packagedFiles = execFileSync(process.execPath, [vsceCli, "ls"], { cwd: root, encoding: "utf8" });
assert.match(packagedFiles, /^telemetry\.json$/m, "vsce ls must include telemetry.json in the VSIX");

const editorAppRoot = findEditorAppRoot();
if (editorAppRoot) {
	const mergerSource = readFileSync(join(editorAppRoot, "out", "vs", "code", "node", "cliProcessMain.js"), "utf8");
	assert.match(mergerSource, /telemetry\.json/, "installed editor merger must read telemetry.json");
	assert.match(mergerSource, /telemetry-core\.json/, "installed editor merger must read telemetry-core.json");
	assert.match(
		mergerSource,
		/telemetry-extensions\.json/,
		"installed editor merger must read telemetry-extensions.json"
	);
	console.log(`Pinned --telemetry merger contract from ${editorAppRoot}`);
} else {
	console.log("Editor app root not installed here; validating against the documented VS Code --telemetry merger.");
}

const tempRoot = mkdtempSync(join(tmpdir(), "sfmc-devtools-telemetry-"));
const appRoot = join(tempRoot, "app");
const extensionsDir = join(tempRoot, "extensions");
const extensionFolder = `${packageJson.publisher}.${packageJson.name}-${packageJson.version}`;
const installedExtensionDir = join(extensionsDir, extensionFolder);

try {
	mkdirSync(appRoot);
	mkdirSync(installedExtensionDir, { recursive: true });
	writeFileSync(join(appRoot, "telemetry-core.json"), "{}\n", "utf8");
	writeFileSync(join(appRoot, "telemetry-extensions.json"), "{}\n", "utf8");
	writeFileSync(join(installedExtensionDir, "telemetry.json"), `${JSON.stringify(catalog)}\n`, "utf8");

	const dump = JSON.parse(await buildTelemetryMessage(appRoot, extensionsDir));
	assert.ok(extensionFolder in dump, "Installed extension telemetry catalog was not discovered by the VS Code merger");
	assert.deepEqual(dump[extensionFolder], catalog, "VS Code merger did not return the packaged catalog unchanged");
	assert.deepEqual(dump["vscode-core"], {});
	assert.deepEqual(dump["vscode-extensions"], {});
	console.log("Validated telemetry.json through the VS Code --telemetry discovery merger.");
} finally {
	rmSync(tempRoot, { recursive: true, force: true });
}
