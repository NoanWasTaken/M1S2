import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const BUNDLE_PATH = resolve(ROOT, 'dist/analytix.js');

function buildBundle() {
    buildSync({
        entryPoints: [resolve(ROOT, 'src/script.ts')],
        bundle: true,
        format: 'iife',
        globalName: 'Analytix',
        outfile: BUNDLE_PATH,
        target: 'es2020',
        platform: 'browser',
    });
}

function runInlineBundle(attrs: Record<string, string>) {
    const inline = document.createElement('script');
    for (const [key, value] of Object.entries(attrs)) {
        inline.setAttribute(key, value);
    }
    inline.textContent = readFileSync(BUNDLE_PATH, 'utf8');
    document.head.appendChild(inline);
}

describe('analytix.js IIFE bundle', () => {
    beforeAll(() => {
        buildBundle();
    });

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
        vi.stubGlobal('navigator', {
            ...navigator,
            sendBeacon: vi.fn(() => true),
        });
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-iife' });
        delete window.Analytix;
    });

    it('exposes window.Analytix with public API', () => {
        runInlineBundle({
            'data-app-id': 'app_iife',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
        });

        expect(window.Analytix).toBeDefined();
        expect(window.Analytix?.Analytics).toBeDefined();
        expect(typeof window.Analytix?.initFromScript).toBe('function');
        expect(typeof window.Analytix?.parseScriptConfig).toBe('function');
    });

    it('auto-inits from data attributes on the executing script tag', () => {
        runInlineBundle({
            'data-app-id': 'app_auto',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
            'data-batch-size': '50',
        });

        window.dispatchEvent(new Event('pagehide'));

        expect(navigator.sendBeacon).toHaveBeenCalled();
        const body = JSON.parse(vi.mocked(navigator.sendBeacon).mock.calls[0][1] as string);
        const types = body.events.map((e: { type: string }) => e.type);
        expect(types).toContain('session_start');
        expect(types).toContain('pageview');
    });
});
