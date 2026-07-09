import type { ServerSdkConfig, ServerEvent } from './types.js'; 

/**
 * Client-side helper a webmaster's SERVER uses to send trusted events
 * (payments, refunds, confirmed signups...) to the analytics API.
 *
 * Authentication is done with the APP_ID + APP_SECRET couple, which only
 * the real server of the client knows. This is what makes these events
 * trustworthy, unlike browser events (APP_ID only).
 */
export class AnalyticsServer {
    constructor(private config: ServerSdkConfig) { }

    /**
     * Send a single server-side event.
     * Example: analytics.track('order_paid', { amount: 79.9, currency: 'EUR' })
     */
    async track(type: string, payload?: Record<string, unknown>): Promise<void> {
        await this.send([{ type, occurredAt: new Date().toISOString(), payload }]);
    }

    /**
     * Send several events in one request (max 50 per batch, API limit).
     */
    async trackBatch(events: ServerEvent[]): Promise<void> {
        const now = new Date().toISOString();
        const normalized = events.map((e) => ({ occurredAt: now, ...e }));
        await this.send(normalized);
    }

    private async send(events: ServerEvent[]): Promise<void> {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-app-id': this.config.appId,
                    'x-app-secret': this.config.appSecret,
                },
                body: JSON.stringify({ events }),
            });

            if (!response.ok) {
                // Golden rule: tracking must NEVER crash the client's app.
                // We log and move on instead of throwing.
                console.error(`[analytics] Ingestion failed: ${response.status}`);
            }
        } catch (error) {
            console.error('[analytics] Ingestion error:', error);
        }
    }
}

export type { ServerSdkConfig, ServerEvent } from './types.js';