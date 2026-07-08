import type { SdkConfig, TrackedEvent } from './types.js';

export class EventQueue {
    private queue: TrackedEvent[] = [];
    private timer: number | null = null;

    constructor(private config: Required<SdkConfig>) { }

    // Add event to queue
    add(event: TrackedEvent): void {
        this.queue.push(event);

        if (this.queue.length >= this.config.batchSize) {
            this.flush();
        }
    }

    // Start periodic sending
    start(): void {
        this.timer = window.setInterval(() => this.flush(), this.config.flushIntervalMs);

        // Send what remains when user leaves page
        window.addEventListener('pagehide', () => this.flush(true));
    }

    // Send queue content
    private flush(useBeacon = false): void {
        if (this.queue.length === 0) return;

        const events = this.queue;
        this.queue = []; // Empty immediately to avoid sending twice

        const body = JSON.stringify({ events });

        if (useBeacon && navigator.sendBeacon) {
            // When page closes : sendBeacon guarantees send
            navigator.sendBeacon(this.config.endpoint, body);
            return;
        }

        // Normal non blocking send
        fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': this.config.appId,
            },
            body,
            keepalive: true, // Allow request to survive page change
        }).catch(() => {
            // Ignore network errors : tracking must never break site
        });
    }
}