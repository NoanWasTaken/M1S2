import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionId, getVisitorId } from './identity.js';

describe('identity', () => {
    beforeEach(() => {
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-test-1234' });
    });

    it('persists visitorId across calls', () => {
        const first = getVisitorId();
        const second = getVisitorId();
        expect(first).toBe('uuid-test-1234');
        expect(second).toBe(first);
    });

    it('persists sessionId within the 30-minute window', () => {
        expect(getSessionId()).toBe('uuid-test-1234');
        expect(getSessionId()).toBe('uuid-test-1234');
    });

    it('rotates sessionId after 30 minutes of inactivity', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

        expect(getSessionId()).toBe('uuid-test-1234');

        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-new-session' });
        vi.setSystemTime(new Date('2026-01-01T12:31:00Z'));

        expect(getSessionId()).toBe('uuid-new-session');
        vi.useRealTimers();
    });

    it('continues when localStorage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(getVisitorId()).toBeTruthy();
        expect(getSessionId()).toBeTruthy();
    });
});
