import type { SdkConfig, TrackedEvent } from './types.js';

export class EventQueue {
    private queue: TrackedEvent[] = [];
    private timer: number | null = null;

    constructor(private config: Required<SdkConfig>) { }

    add(event: TrackedEvent): void {
        this.queue.push(event);

        if (this.queue.length >= this.config.batchSize) {
            this.flush();
        }
    }

    start(): void {
        this.timer = window.setInterval(() => this.flush(), this.config.flushIntervalMs);
        window.addEventListener('pagehide', () => this.flush(true));
    }

    private flush(_useBeacon = false): void {
        if (this.queue.length === 0) return;

        const events = this.queue;
        this.queue = []; // Prevent double send

        fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': this.config.appId,
            },
            body: JSON.stringify({ events }),
            keepalive: true,
        }).catch(() => {
            // Never break host site
        });
    }
}
