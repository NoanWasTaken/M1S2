import { Analytics, initFromScript, parseScriptConfig } from './index.js';

const api = { Analytics, initFromScript, parseScriptConfig };

export { Analytics, initFromScript, parseScriptConfig };

if (typeof window !== 'undefined') {
    window.Analytix = api;
}

initFromScript();

declare global {
    interface Window {
        Analytix: typeof api;
    }
}
