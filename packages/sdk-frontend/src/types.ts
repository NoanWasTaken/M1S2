export type SdkConfig = {
    appId: string;
    endpoint: string;
    flushIntervalMs?: number;
    batchSize?: number;
};

export type TrackedEvent = {
    type: string;
    url?: string;
    occurredAt: string;
    visitorId: string;
    sessionId: string;
    payload?: Record<string, unknown>;
  };