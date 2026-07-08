export type SdkConfig = {
    appId: string;
    endpoint: string; // Ingestion API URL
    flushIntervalMs?: number; // How often to send
    batchSize?: number; // Max size of a batch
};

export type TrackedEvent = {
    type: string;
    url?: string;
    occurredAt: string;
    visitorId: string;
    sessionId: string;
    payload?: Record<string, unknown>;
  };