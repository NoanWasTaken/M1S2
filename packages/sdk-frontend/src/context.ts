// Classify the referrer into a category
function classifyReferrer(referrer: string): string {
    if (!referrer) return 'direct';

    let host = '';
    try {
        host = new URL(referrer).hostname.toLowerCase();
    } catch {
        return 'direct';
    }

    if (host === window.location.hostname) return 'direct';

    const socialHosts = ['facebook.', 'instagram.', 'twitter.', 'x.com', 't.co', 'linkedin.', 'tiktok.', 'youtube.', 'reddit.', 'pinterest.'];
    const searchHosts = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'qwant.', 'ecosia.'];

    if (socialHosts.some((s) => host.includes(s))) return 'social';
    if (searchHosts.some((s) => host.includes(s))) return 'organic';

    return 'referral';
}

export function collectContext(): Record<string, unknown> {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    const referrer = document.referrer || '';

    return {
        device: isMobile ? 'mobile' : 'desktop',
        referrer: referrer || undefined,
        referrerType: classifyReferrer(referrer),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
    };
}