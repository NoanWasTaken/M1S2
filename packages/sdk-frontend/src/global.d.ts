import type { SdkConfig } from './types.js';

declare global {
    interface Window {
        Analytix: {
            Analytics: {
                init(config: SdkConfig): void;
                track(type: string, payload?: Record<string, unknown>): void;
            };
            initFromScript: (script?: HTMLScriptElement | null) => boolean;
            parseScriptConfig: (script: HTMLScriptElement | null | undefined) => SdkConfig | null;
        };
    }
}

export {};
