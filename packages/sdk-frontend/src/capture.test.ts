import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startAutoCapture } from './capture.js';

describe('startAutoCapture', () => {
    const tracked: Array<{ type: string; payload?: Record<string, unknown> }> = [];

    beforeEach(() => {
        tracked.length = 0;
        document.body.innerHTML = '';
        Object.defineProperty(document, 'referrer', { value: 'https://google.com', configurable: true });
    });

    function track(type: string, payload?: Record<string, unknown>) {
        tracked.push({ type, payload });
    }

    it('emits pageview on startup', () => {
        startAutoCapture(track);
        expect(tracked[0]).toEqual({ type: 'pageview', payload: { referrer: 'https://google.com' } });
    });

    it('tracks click on interactive elements', () => {
        startAutoCapture(track);
        const btn = document.createElement('button');
        btn.id = 'buy';
        btn.textContent = 'Buy';
        document.body.appendChild(btn);

        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }));

        const click = tracked.find((e) => e.type === 'click');
        expect(click?.payload).toMatchObject({
            x: 10,
            y: 20,
            tag: 'button',
            nature: 'action',
            id: 'buy',
            text: 'Buy',
        });
    });

    it('classifies hash links as action not navigation', () => {
        startAutoCapture(track);
        const link = document.createElement('a');
        link.href = '#section';
        link.textContent = 'Jump';
        document.body.appendChild(link);

        link.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 1, clientY: 1 }));

        const click = tracked.find((e) => e.type === 'click');
        expect(click?.payload?.nature).toBe('action');
    });

    it('emits page_exit on pagehide when time elapsed', () => {
        vi.useFakeTimers();
        startAutoCapture(track);
        vi.advanceTimersByTime(2000);

        window.dispatchEvent(new Event('pagehide'));

        const exit = tracked.find((e) => e.type === 'page_exit');
        expect(exit?.payload?.duration).toBeGreaterThan(0);
        vi.useRealTimers();
    });

    it('emits tabchange on visibilitychange', () => {
        startAutoCapture(track);
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(tracked.some((e) => e.type === 'tabchange' && e.payload?.state === 'hidden')).toBe(true);
    });
});
