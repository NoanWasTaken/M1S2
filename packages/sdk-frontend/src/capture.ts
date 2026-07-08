type TrackFn = (type: string, payload?: Record<string, unknown>) => void;
type ElementNature = 'navigation' | 'action' | 'unknown';

// Classify element by its real behavior
function classifyElement(el: HTMLElement): { nature: ElementNature; href?: string } {
    const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
        const href = anchor.getAttribute('href') ?? '';
        const isRealNavigation =
            href !== '' && href !== '#' && !href.startsWith('#') && !href.startsWith('javascript:');
        if (isRealNavigation) return { nature: 'navigation', href: anchor.href };
        return { nature: 'action' }; // <a href="#"> = action déguisée
    }
    const interactive = el.closest('button, [role="button"], input[type="submit"], input[type="button"]');
    if (interactive) return { nature: 'action' };
    return { nature: 'unknown' };
}

function findInteractive(target: EventTarget | null): HTMLElement | null {
    const start = target as HTMLElement | null;
    return start?.closest('a, button, input, [role="button"], [onclick]') as HTMLElement | null;
}

function describe(el: HTMLElement) {
    const { nature, href } = classifyElement(el);
    return {
        tag: el.tagName.toLowerCase(),
        nature,                       
        href,                         
        id: el.id || undefined,
        text: el.textContent?.trim().slice(0, 100) || undefined,
    };
}

export function startAutoCapture(track: TrackFn): void {
    // 1. Page view
    track('pageview', { referrer: document.referrer });

    // 2. Clicks interactive elements
    document.addEventListener('click', (e) => {
        const el = findInteractive(e.target);
        if (!el) return; // ignore clicks in the void
        track('click', { x: e.clientX, y: e.clientY, ...describe(el) });
    });

    // 3. Hover interactive elements
    let lastHovered: HTMLElement | null = null;
    document.addEventListener('mouseover', (e) => {
        const el = findInteractive(e.target);
        if (!el || el === lastHovered) return;
        lastHovered = el;
        track('hover', describe(el));
    });

    // 4. Tab change / visibility change
    document.addEventListener('visibilitychange', () => {
        track('tabchange', { state: document.visibilityState });
    });

    // 5. SPA navigation
    window.addEventListener('popstate', () => {
        track('pageview', { referrer: document.referrer });
    });
}