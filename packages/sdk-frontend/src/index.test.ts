import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Analytics', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
        vi.stubGlobal('navigator', {
            ...navigator,
            sendBeacon: vi.fn(() => true),
        });
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-analytics' });
    });

    it('warns when track is called before init', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { Analytics } = await import('./index.js');

        Analytics.track('custom');

        expect(warn).toHaveBeenCalledWith('[Analytics] init() must be called before track()');
    });

    it('init sends session_start then queues autocapture events', async () => {
        const { Analytics } = await import('./index.js');

        Analytics.init({
            appId: 'app_demo',
            endpoint: 'https://api.example.com/ingestion/browser',
            batchSize: 50,
        });

        Analytics.track('custom_event', { foo: 'bar' });

        // Force flush by filling batch won't happen with 2 events — trigger pagehide instead
        window.dispatchEvent(new Event('pagehide'));

        expect(navigator.sendBeacon).toHaveBeenCalled();
        const body = JSON.parse(vi.mocked(navigator.sendBeacon).mock.calls[0][1] as string);
        const types = body.events.map((e: { type: string }) => e.type);

        expect(types).toContain('session_start');
        expect(types).toContain('pageview');
        expect(types).toContain('custom_event');

        for (const event of body.events) {
            expect(event.visitorId).toBe('uuid-analytics');
            expect(event.sessionId).toBe('uuid-analytics');
            expect(event.url).toBe(window.location.href);
            expect(event.occurredAt).toBeTruthy();
        }
    });
});
