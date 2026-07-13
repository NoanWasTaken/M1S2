export function normalizeUrl(rawUrl: string | undefined): string | undefined {
    if (!rawUrl) return rawUrl;

    try {
        const url = new URL(rawUrl);

        url.hash = '';

        if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
            url.pathname = url.pathname.slice(0, -1);
        }

        const paramsToStrip = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
        paramsToStrip.forEach((p) => url.searchParams.delete(p));

        return url.toString();
    } catch {
        return rawUrl;
    }
}