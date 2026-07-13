import { describe, expect, it, vi } from 'vitest';
import { startAutoCapture } from './capture.js';

describe('startAutoCapture navigation (isolated)', () => {
    function trackInto(tracked: Array<{ type: string; payload?: Record<string, unknown> }>) {
        return (type: string, payload?: Record<string, unknown>) => {
            tracked.push({ type, payload });
        };
    }

    it('emits one pageview on popstate', () => {
        const tracked: Array<{ type: string }> = [];
        startAutoCapture(trackInto(tracked));

        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(tracked.filter((e) => e.type === 'pageview')).toHaveLength(2);
    });

    it('emits pageview on history.pushState', () => {
        const tracked: Array<{ type: string }> = [];
        startAutoCapture(trackInto(tracked));

        history.pushState({}, '', '/products');

        expect(tracked.filter((e) => e.type === 'pageview')).toHaveLength(2);
    });

    it('emits pageview on history.replaceState', () => {
        const tracked: Array<{ type: string }> = [];
        startAutoCapture(trackInto(tracked));

        history.replaceState({}, '', '/checkout');

        expect(tracked.filter((e) => e.type === 'pageview')).toHaveLength(2);
    });

    it('emits pageview on hashchange', () => {
        const tracked: Array<{ type: string }> = [];
        startAutoCapture(trackInto(tracked));

        window.dispatchEvent(new HashChangeEvent('hashchange'));

        expect(tracked.filter((e) => e.type === 'pageview')).toHaveLength(2);
    });

    it('emits page_exit before SPA navigation when time elapsed', () => {
        vi.useFakeTimers();
        const tracked: Array<{ type: string; payload?: Record<string, unknown> }> = [];
        startAutoCapture(trackInto(tracked));

        vi.advanceTimersByTime(3000);
        history.pushState({}, '', '/about');

        const exits = tracked.filter((e) => e.type === 'page_exit');
        expect(exits).toHaveLength(1);
        expect(exits[0]?.payload?.duration).toBeGreaterThan(0);
        vi.useRealTimers();
    });

    it('emits tabchange once per visibilitychange', () => {
        const tracked: Array<{ type: string; payload?: Record<string, unknown> }> = [];
        startAutoCapture(trackInto(tracked));

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(tracked.filter((e) => e.type === 'tabchange')).toHaveLength(1);
    });
});
