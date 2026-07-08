export function collectContext(): Record<string, unknown> {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    return {
        device: isMobile ? 'mobile' : 'desktop',
        referrer: document.referrer || undefined,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
    };
}