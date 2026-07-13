import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageTimer } from './timer.js';

describe('PageTimer', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('measures visible time in seconds', () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

        const timer = new PageTimer();
        vi.advanceTimersByTime(5000);

        expect(timer.getDuration()).toBe(5);
    });

    it('pauses when hidden and excludes hidden time', () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

        const timer = new PageTimer();
        vi.advanceTimersByTime(3000);
        timer.pause();
        vi.advanceTimersByTime(10_000);
        timer.resume();
        vi.advanceTimersByTime(2000);

        expect(timer.getDuration()).toBe(5);
    });

    it('returns 0 when never visible', () => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        expect(new PageTimer().getDuration()).toBe(0);
    });
});
