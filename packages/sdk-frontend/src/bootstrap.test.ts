import { describe, expect, it, vi } from 'vitest';
import { initFromScript, parseScriptConfig } from './bootstrap.js';
import type { SdkConfig } from './types.js';

function makeScript(attrs: Record<string, string>): HTMLScriptElement {
    const script = document.createElement('script');
    for (const [key, value] of Object.entries(attrs)) {
        script.setAttribute(key, value);
    }
    return script;
}

describe('parseScriptConfig', () => {
    it('returns null when script is missing', () => {
        expect(parseScriptConfig(null)).toBeNull();
        expect(parseScriptConfig(undefined)).toBeNull();
    });

    it('returns null when required attributes are missing', () => {
        expect(parseScriptConfig(makeScript({}))).toBeNull();
        expect(parseScriptConfig(makeScript({ 'data-app-id': 'app_x' }))).toBeNull();
        expect(parseScriptConfig(makeScript({ 'data-endpoint': 'https://api.example.com' }))).toBeNull();
    });

    it('parses required data attributes', () => {
        const config = parseScriptConfig(makeScript({
            'data-app-id': 'app_demo',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
        }));

        expect(config).toEqual({
            appId: 'app_demo',
            endpoint: 'https://api.example.com/ingestion/browser',
        });
    });

    it('parses optional numeric attributes', () => {
        const config = parseScriptConfig(makeScript({
            'data-app-id': 'app_demo',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
            'data-flush-interval': '3000',
            'data-batch-size': '10',
        }));

        expect(config).toEqual({
            appId: 'app_demo',
            endpoint: 'https://api.example.com/ingestion/browser',
            flushIntervalMs: 3000,
            batchSize: 10,
        });
    });

    it('ignores invalid optional numeric attributes', () => {
        const config = parseScriptConfig(makeScript({
            'data-app-id': 'app_demo',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
            'data-flush-interval': 'abc',
            'data-batch-size': '0',
        }));

        expect(config).toEqual({
            appId: 'app_demo',
            endpoint: 'https://api.example.com/ingestion/browser',
        });
    });
});

describe('initFromScript', () => {
    it('calls init with parsed config from explicit script element', () => {
        const init = vi.fn<(config: SdkConfig) => void>();
        const script = makeScript({
            'data-app-id': 'app_demo',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
        });

        expect(initFromScript(init, script)).toBe(true);
        expect(init).toHaveBeenCalledWith({
            appId: 'app_demo',
            endpoint: 'https://api.example.com/ingestion/browser',
        });
    });

    it('returns false when config is invalid', () => {
        const init = vi.fn<(config: SdkConfig) => void>();
        expect(initFromScript(init, makeScript({}))).toBe(false);
        expect(init).not.toHaveBeenCalled();
    });

    it('falls back to document.currentScript', () => {
        const init = vi.fn<(config: SdkConfig) => void>();
        const script = makeScript({
            'data-app-id': 'app_current',
            'data-endpoint': 'https://api.example.com/ingestion/browser',
        });
        Object.defineProperty(document, 'currentScript', { value: script, configurable: true });

        expect(initFromScript(init)).toBe(true);
        expect(init).toHaveBeenCalledWith({
            appId: 'app_current',
            endpoint: 'https://api.example.com/ingestion/browser',
        });
    });
});
