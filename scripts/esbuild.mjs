/**
 * Bundles the extension (src/extension.ts) into dist/extension.bundle.js.
 *
 * Replaces the previous webpack + ts-loader build. Type-checking is no longer
 * part of the bundle step (esbuild does not type-check) — it runs separately
 * via `npm run lint-ts` (tsc --noEmit). The tsconfig `paths` aliases are
 * mirrored here through esbuild's `alias` option so imports like `@types` and
 * `utils` resolve to their barrel modules.
 *
 * Flags (passed through from npm scripts):
 *   --minify     production build (used by `package` / `vscode:prepublish`)
 *   --sourcemap  emit a source map (used by dev `compile` / `watch`)
 *   --watch      rebuild on change (dev)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(scriptDirectory);
const entry = path.join(projectRoot, 'src', 'extension.ts');
const outfile = path.join(projectRoot, 'dist', 'extension.bundle.js');

const src = (...segments) => path.join(projectRoot, 'src', ...segments);

const passthrough = new Set(process.argv.slice(2));
const shouldMinify = passthrough.has('--minify');
const shouldSourcemap = passthrough.has('--sourcemap');
const shouldWatch = passthrough.has('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: [entry],
    bundle: true,
    outfile,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    minify: shouldMinify,
    sourcemap: shouldSourcemap,
    // Mirror the tsconfig `paths` aliases (single source of truth stays in
    // tsconfig for tsc + mocha; these entries keep the bundler in sync).
    alias: {
        '@types': src('types', 'index.ts'),
        '@enums': src('enums', 'index.ts'),
        '@config': src('config', 'index.ts'),
        '@messages': src('messages', 'index.ts'),
        utils: src('utils', 'index.ts'),
    },
};

if (shouldWatch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    // eslint-disable-next-line no-console -- watch mode reports readiness to the terminal
    console.log(`watching -> ${outfile}`);
} else {
    await esbuild.build(buildOptions);
    // eslint-disable-next-line no-console -- build script reports its output path to the terminal
    console.log(`extension bundled -> ${outfile}`);
}
