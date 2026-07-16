import type { SdkConfig, TrackedEvent } from './types.js';

export class EventQueue {
  private queue: TrackedEvent[] = [];
  private timer: number | null = null;

  constructor(private config: Required<SdkConfig>) {}

  add(event: TrackedEvent): void {
    this.queue.push(event);
    console.info('[sdk][queue] add', {
      type: event.type,
      queued: this.queue.length,
      batchSize: this.config.batchSize,
    });

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  start(): void {
    console.info('[sdk][queue] start', {
      flushIntervalMs: this.config.flushIntervalMs,
      batchSize: this.config.batchSize,
      endpoint: this.config.endpoint,
    });
    this.timer = window.setInterval(() => this.flush(), this.config.flushIntervalMs);
    window.addEventListener('pagehide', () => this.flush(true));
  }

  private flush(useBeacon = false): void {
    if (this.queue.length === 0) return;

    const events = this.queue;
    this.queue = [];
    console.info('[sdk][queue] flush', {
      count: events.length,
      useBeacon,
      endpoint: this.config.endpoint,
    });

    const body = JSON.stringify({ events, app_id: this.config.appId });

    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        this.config.endpoint,
        new Blob([body], { type: 'application/json' }),
      );
      console.info('[sdk][queue] beacon', {
        ok,
        count: events.length,
        endpoint: this.config.endpoint,
      });
      return;
    }

    fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': this.config.appId,
      },
      body,
      keepalive: true,
    })
      .then((res) => {
        console.info('[sdk][queue] fetch_response', {
          ok: res.ok,
          status: res.status,
          endpoint: this.config.endpoint,
        });
      })
      .catch((err) => {
        console.error('[sdk][queue] fetch_error', {
          endpoint: this.config.endpoint,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }
}
