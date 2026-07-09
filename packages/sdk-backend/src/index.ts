import type { ServerSdkConfig, ServerEvent } from './types.js'; 

export class AnalyticsServer {
    constructor(private config: ServerSdkConfig) { }

    async track(type: string, payload?: Record<string, unknown>): Promise<void> {
        await this.send([{ type, occurredAt: new Date().toISOString(), payload }]);
    }

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
                console.error(`[analytics] Ingestion failed: ${response.status}`);
            }
        } catch (error) {
            console.error('[analytics] Ingestion error:', error);
        }
    }
}

export type { ServerSdkConfig, ServerEvent } from './types.js';