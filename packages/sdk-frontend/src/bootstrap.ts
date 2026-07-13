import type { SdkConfig } from './types.js';

export function parseScriptConfig(script: HTMLScriptElement | null | undefined): SdkConfig | null {
    if (!script) return null;

    const appId = script.dataset.appId?.trim();
    const endpoint = script.dataset.endpoint?.trim();
    if (!appId || !endpoint) return null;

    const config: SdkConfig = { appId, endpoint };

    const flushIntervalMs = script.dataset.flushInterval;
    if (flushIntervalMs) {
        const parsed = Number(flushIntervalMs);
        if (!Number.isNaN(parsed) && parsed > 0) {
            config.flushIntervalMs = parsed;
        }
    }

    const batchSize = script.dataset.batchSize;
    if (batchSize) {
        const parsed = Number(batchSize);
        if (!Number.isNaN(parsed) && parsed > 0) {
            config.batchSize = parsed;
        }
    }

    return config;
}

export function initFromScript(
    init: (config: SdkConfig) => void,
    script?: HTMLScriptElement | null,
): boolean {
    const config = parseScriptConfig(script ?? (document.currentScript as HTMLScriptElement | null));
    if (!config) return false;

    init(config);
    return true;
}
