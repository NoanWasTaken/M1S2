import { buildSync } from 'esbuild';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const shared = {
    entryPoints: [resolve(ROOT, 'src/script.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'Analytix',
    target: 'es2020',
    platform: 'browser',
};

buildSync({
    ...shared,
    outfile: resolve(ROOT, 'dist/analytix.js'),
});

buildSync({
    ...shared,
    outfile: resolve(ROOT, 'dist/analytix.min.js'),
    minify: true,
});
