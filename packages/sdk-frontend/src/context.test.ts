import { beforeEach, describe, expect, it } from 'vitest';
import { collectContext } from './context.js';

describe('context', () => {
    beforeEach(() => {
        Object.defineProperty(document, 'referrer', { value: '', configurable: true });
        Object.defineProperty(window, 'location', {
            value: { hostname: 'shop.example.com' },
            configurable: true,
        });
    });

    it('classifies empty referrer as direct', () => {
        const ctx = collectContext();
        expect(ctx.referrerType).toBe('direct');
        expect(ctx.referrer).toBeUndefined();
    });

    it('classifies google referrer as organic', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com/search?q=test',
            configurable: true,
        });
        expect(collectContext().referrerType).toBe('organic');
    });

    it('classifies facebook referrer as social', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.facebook.com/post/123',
            configurable: true,
        });
        expect(collectContext().referrerType).toBe('social');
    });

    it('classifies same-host referrer as direct', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://shop.example.com/other',
            configurable: true,
        });
        expect(collectContext().referrerType).toBe('direct');
    });

    it('includes viewport and language', () => {
        const ctx = collectContext();
        expect(ctx.viewportWidth).toBe(window.innerWidth);
        expect(ctx.viewportHeight).toBe(window.innerHeight);
        expect(ctx.language).toBe(navigator.language);
    });
});
