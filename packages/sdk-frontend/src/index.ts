import type { SdkConfig, TrackedEvent } from './types.js';
import { getVisitorId, getSessionId } from './identity.js';
import { collectContext } from './context.js';
import { startAutoCapture } from './capture.js';
import { EventQueue } from './queue.js';

let queue: EventQueue | null = null;

export const Analytics = {
    init(config: SdkConfig): void {
        const fullConfig = { flushIntervalMs: 5000, batchSize: 20, ...config };
        queue = new EventQueue(fullConfig);
        queue.start();

        this.track('session_start', collectContext());

        startAutoCapture((type, payload) => this.track(type, payload));
    },

    track(type: string, payload?: Record<string, unknown>): void {
        if (!queue) {
            console.warn('[Analytics] init() must be called before track()');
            return;
        }

        const event: TrackedEvent = {
            type,
            url: window.location.href,
            occurredAt: new Date().toISOString(),
            payload,
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
        };

        queue.add(event);
    },
};
