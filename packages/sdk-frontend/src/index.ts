import type { SdkConfig, TrackedEvent } from './types.js';
import { getVisitorId, getSessionId } from './identity.js';
import { collectContext } from './context.js';
import { startAutoCapture } from './capture.js';
import { EventQueue } from './queue.js';
import { initFromScript as bootstrapInitFromScript, parseScriptConfig } from './bootstrap.js';

let queue: EventQueue | null = null;

export const Analytics = {
  init(config: SdkConfig): void {
    const fullConfig = { flushIntervalMs: 5000, batchSize: 20, ...config };
    queue = new EventQueue(fullConfig);
    startAutoCapture((type, payload) => this.track(type, payload));
    queue.start();

    this.track('session_start', collectContext());
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

export function initFromScript(script?: HTMLScriptElement | null): boolean {
  return bootstrapInitFromScript((config) => Analytics.init(config), script);
}

export { parseScriptConfig };
