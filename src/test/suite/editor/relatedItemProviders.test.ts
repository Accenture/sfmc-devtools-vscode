import * as assert from "assert";
import { VSCode } from "@types";
import RelatedItemLinkProvider from "../../../editor/relatedItemLinkProvider";
import RelatedItemDiagnosticProvider from "../../../editor/relatedItemDiagnosticProvider";

const KEY = "shared-key";
const BU = "retrieve/cred/bu";

/** Builds a single-line relation document in either asset context. */
function documentFor(inside: boolean, bu = BU, text = `{"r__asset_key":"${KEY}"}`): VSCode.TextDocument {
	const path = `/workspace/${bu}/${inside ? "asset/message/source" : "journey"}/source.json`;
	return {
		uri: VSCode.Uri.file(path),
		getText: () => text,
		positionAt: (offset: number) => new VSCode.Position(0, offset)
	} as VSCode.TextDocument;
}

/** Lists the exact metadata candidates in their required lookup order. */
function candidates(inside: boolean, bu = BU): string[] {
	const subtype = inside ? "template" : "message";
	return [
		`${bu}/asset/${subtype}/${KEY}/${KEY}.asset-${subtype}-meta.json`,
		`${bu}/asset/mobile/${KEY}.asset-mobile-meta.json`,
		`${bu}/asset/webstudio/${KEY}.asset-webstudio-meta.json`,
		`${bu}/asset/webstudio/${KEY}/${KEY}.asset-webstudio-meta.json`
	];
}

suite("Related item providers – asset metadata resolution", () => {
	const originalFindFiles = VSCode.workspace.findFiles;
	let files: Set<string>;
	let calls: string[];
	let links: RelatedItemLinkProvider;
	let diagnostics: RelatedItemDiagnosticProvider;

	setup(() => {
		files = new Set();
		calls = [];
		links = new RelatedItemLinkProvider();
		diagnostics = new RelatedItemDiagnosticProvider();
		VSCode.workspace.findFiles = async (pattern, _exclude, maxResults) => {
			assert.strictEqual(typeof pattern, "string");
			const path = pattern as string;
			calls.push(path);
			const matches = path.endsWith("/**")
				? [...files].filter(file => file.startsWith(path.slice(0, -2)))
				: [...files].filter(file => file === path);
			return matches.slice(0, maxResults).map(file => VSCode.Uri.file(`/workspace/${file}`));
		};
	});

	teardown(() => {
		VSCode.workspace.findFiles = originalFindFiles;
		diagnostics.getDiagnosticCollection().dispose();
	});

	for (const inside of [false, true]) {
		const context = inside ? "inside asset" : "outside asset";
		for (const index of [0, 1, 2, 3]) {
			test(`${context}: candidate ${index} resolves and stops before lower-priority matches`, async () => {
				const paths = candidates(inside);
				// All later candidates exist too, proving precedence rather than mere discovery.
				files = new Set(paths.slice(index));
				const document = documentFor(inside);
				const result = await links.provideDocumentLinks(document);
				assert.strictEqual(result.length, 1);
				assert.strictEqual(result[0].target?.path, `/workspace/${paths[index]}`);
				const start = document.getText().indexOf(KEY);
				assert.strictEqual(result[0].range.start.character, start);
				assert.strictEqual(result[0].range.end.character, start + KEY.length);
				assert.deepStrictEqual(calls, paths.slice(0, index + 1));
				calls = [];
				await diagnostics.validateDocument(document);
				assert.deepStrictEqual(diagnostics.getDiagnosticCollection().get(document.uri), []);
				assert.deepStrictEqual(calls, [`${BU}/asset/**`, ...paths.slice(0, index + 1)]);
			});
		}

		test(`${context}: missing key warns after every candidate, without searching other subtypes`, async () => {
			const paths = candidates(inside);
			// The opposite legacy context and source fragments must not satisfy this reference.
			files = new Set([candidates(!inside)[0], `${BU}/asset/webstudio/${KEY}/${KEY}.html`]);
			const document = documentFor(inside);
			assert.deepStrictEqual(await links.provideDocumentLinks(document), []);
			assert.deepStrictEqual(calls, paths);
			calls = [];
			await diagnostics.validateDocument(document);
			const result = diagnostics.getDiagnosticCollection().get(document.uri)!;
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].severity, VSCode.DiagnosticSeverity.Warning);
			assert.ok(result[0].message.includes("was not found on the BU"));
			assert.strictEqual((result[0].code as { value: string }).value, "warnOnMissingJsonRelation");
			assert.deepStrictEqual(calls, [`${BU}/asset/**`, ...paths]);
		});
	}

	test("missing folder warns without attempting key resolution", async () => {
		const document = documentFor(false);
		assert.deepStrictEqual(await links.provideDocumentLinks(document), []);
		assert.deepStrictEqual(calls, candidates(false));
		calls = [];
		await diagnostics.validateDocument(document);
		const result = diagnostics.getDiagnosticCollection().get(document.uri)!;
		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].severity, VSCode.DiagnosticSeverity.Warning);
		assert.ok(result[0].message.includes("type folder has not been retrieved"));
		assert.deepStrictEqual(calls, [`${BU}/asset/**`]);
	});

	test("typeFilter rejects the relation before any filesystem lookup", async () => {
		diagnostics.getDiagnosticCollection().dispose();
		diagnostics = new RelatedItemDiagnosticProvider((type, project) => {
			assert.strictEqual(type, "asset");
			assert.strictEqual(project, "/workspace");
			return false;
		});
		const document = documentFor(false);
		await diagnostics.validateDocument(document);
		assert.deepStrictEqual(diagnostics.getDiagnosticCollection().get(document.uri), []);
		assert.deepStrictEqual(calls, []);
	});

	for (const present of [false, true]) {
		test(`sequential lookups reuse ${present ? "positive" : "negative"} caches`, async () => {
			const target = candidates(false)[3];
			files.add(`${BU}/asset/other.json`);
			if (present) files.add(target);
			const document = documentFor(false);
			const firstLinks = await links.provideDocumentLinks(document);
			await diagnostics.validateDocument(document);
			const firstDiagnostics = diagnostics.getDiagnosticCollection().get(document.uri);
			assert.strictEqual(firstLinks.length, present ? 1 : 0);
			assert.strictEqual(firstDiagnostics?.length, present ? 0 : 1);
			assert.strictEqual(calls.length, 9);
			calls = [];
			// Change the backing files; cache behavior intentionally remains unchanged.
			if (present) files.delete(target);
			else files.add(target);
			assert.deepStrictEqual(await links.provideDocumentLinks(document), firstLinks);
			await diagnostics.validateDocument(document);
			assert.deepStrictEqual(diagnostics.getDiagnosticCollection().get(document.uri), firstDiagnostics);
			assert.deepStrictEqual(calls, []);
		});
	}

	test("same key caches remain separated by BU and asset context", async () => {
		const otherBu = "retrieve/cred/other-bu";
		files = new Set([candidates(false)[0], candidates(true)[0], `${otherBu}/asset/other.json`]);
		for (const [inside, bu, expected] of [
			[false, BU, candidates(false)[0]],
			[true, BU, candidates(true)[0]],
			[false, otherBu, undefined]
		] as const) {
			calls = [];
			const document = documentFor(inside, bu);
			const result = await links.provideDocumentLinks(document);
			assert.strictEqual(result.length, expected ? 1 : 0);
			assert.strictEqual(result[0]?.target?.path, expected ? `/workspace/${expected}` : undefined);
			await diagnostics.validateDocument(document);
			assert.strictEqual(diagnostics.getDiagnosticCollection().get(document.uri)?.length, expected ? 0 : 1);
			assert.ok(calls.length > 0);
			assert.ok(calls.every(path => path.startsWith(`${bu}/`)));
		}
	});

	test("automation asset relations retain forward and reverse parsing", async () => {
		files.add(candidates(false)[1]);
		for (const text of [`{"r__type":"asset","r__key":"${KEY}"}`, `{"r__key":"${KEY}","r__type":"asset"}`]) {
			const document = documentFor(false, BU, text);
			const result = await links.provideDocumentLinks(document);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].target?.path, `/workspace/${candidates(false)[1]}`);
			assert.strictEqual(result[0].range.start.character, text.indexOf(KEY));
			await diagnostics.validateDocument(document);
			assert.deepStrictEqual(diagnostics.getDiagnosticCollection().get(document.uri), []);
		}
	});
});
