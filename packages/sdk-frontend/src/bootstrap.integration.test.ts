import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('initFromScript integration', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
        vi.stubGlobal('navigator', {
            ...navigator,
            sendBeacon: vi.fn(() => true),
        });
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-script' });
    });

    it('initializes Analytics from script data attributes', async () => {
        const { initFromScript } = await import('./index.js');

        const script = document.createElement('script');
        script.dataset.appId = 'app_from_script';
        script.dataset.endpoint = 'https://api.example.com/ingestion/browser';
        script.dataset.batchSize = '50';

        expect(initFromScript(script)).toBe(true);

        window.dispatchEvent(new Event('pagehide'));

        expect(navigator.sendBeacon).toHaveBeenCalled();
        const text = await (vi.mocked(navigator.sendBeacon).mock.calls[0][1] as Blob).text();
        const body = JSON.parse(text);
        const types = body.events.map((e: { type: string }) => e.type);

        expect(types).toContain('session_start');
        expect(types).toContain('pageview');
    });
});
