export type ServerSdkConfig = {
    appId: string;
    appSecret: string;
    endpoint: string;
};

export type ServerEvent = {
    type: string;
    occurredAt?: string;
    payload?: Record<string, unknown>;
};