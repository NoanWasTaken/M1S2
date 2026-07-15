import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventQueue } from './queue.js';
import type { TrackedEvent } from './types.js';

const CONFIG = {
    appId: 'app_test',
    endpoint: 'https://api.example.com/ingestion/browser',
    flushIntervalMs: 5000,
    batchSize: 3,
};

function makeEvent(type: string): TrackedEvent {
    return {
        type,
        url: 'https://shop.example.com/',
        occurredAt: new Date().toISOString(),
        visitorId: 'v1',
        sessionId: 's1',
    };
}

describe('EventQueue', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
        vi.stubGlobal('navigator', {
            ...navigator,
            sendBeacon: vi.fn(() => true),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('flushes via fetch when batch size is reached', () => {
        const queue = new EventQueue(CONFIG);
        queue.add(makeEvent('pageview'));
        queue.add(makeEvent('click'));
        expect(fetch).not.toHaveBeenCalled();

        queue.add(makeEvent('hover'));
        expect(fetch).toHaveBeenCalledOnce();

        const [url, init] = vi.mocked(fetch).mock.calls[0];
        expect(url).toBe(CONFIG.endpoint);
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({
            'Content-Type': 'application/json',
            'x-app-id': CONFIG.appId,
        });
        expect(init?.keepalive).toBe(true);

        const body = JSON.parse(init?.body as string);
        expect(body.events).toHaveLength(3);
        expect(body.events.map((e: TrackedEvent) => e.type)).toEqual(['pageview', 'click', 'hover']);
    });

    it('uses sendBeacon on pagehide flush', async () => {
        const queue = new EventQueue(CONFIG);
        queue.start();
        queue.add(makeEvent('page_exit'));

        window.dispatchEvent(new Event('pagehide'));

        expect(navigator.sendBeacon).toHaveBeenCalledOnce();
        expect(fetch).not.toHaveBeenCalled();

        const [url, body] = vi.mocked(navigator.sendBeacon).mock.calls[0];
        expect(url).toBe(CONFIG.endpoint);
        const text = await (body as Blob).text();
        expect(JSON.parse(text).events[0].type).toBe('page_exit');
    });

    it('flushes periodically via setInterval', async () => {
        vi.useFakeTimers();
        const queue = new EventQueue(CONFIG);
        queue.start();
        queue.add(makeEvent('pageview'));

        await vi.advanceTimersByTimeAsync(5000);
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('does not throw when fetch fails', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('network'));
        const queue = new EventQueue(CONFIG);

        expect(() => {
            queue.add(makeEvent('a'));
            queue.add(makeEvent('b'));
            queue.add(makeEvent('c'));
        }).not.toThrow();
    });
});
