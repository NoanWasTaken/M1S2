import { PageTimer } from './timer.js';

type TrackFn = (type: string, payload?: Record<string, unknown>) => void;
type ElementNature = 'navigation' | 'action' | 'unknown';

function classifyElement(el: HTMLElement): { nature: ElementNature; href?: string } {
    const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
        const href = anchor.getAttribute('href') ?? '';
        const isRealNavigation =
            href !== '' && href !== '#' && !href.startsWith('#') && !href.startsWith('javascript:');
        if (isRealNavigation) return { nature: 'navigation', href: anchor.href };
        return { nature: 'action' }; // Hash link: action
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

function patchHistory(onNavigate: () => void): void {
    const { pushState, replaceState } = history;

    history.pushState = function (state, title, url) {
        pushState.call(history, state, title, url);
        onNavigate();
    };

    history.replaceState = function (state, title, url) {
        replaceState.call(history, state, title, url);
        onNavigate();
    };
}

export function startAutoCapture(track: TrackFn): void {
    track('pageview', { referrer: document.referrer });

    let timer = new PageTimer();

    const sendPageDuration = () => {
        const duration = timer.getDuration();
        if (duration > 0) {
            track('page_exit', { duration });
        }
    };

    const handleNavigation = () => {
        sendPageDuration();
        timer = new PageTimer();
        track('pageview', { referrer: document.referrer });
    };

    document.addEventListener('visibilitychange', () => {
        track('tabchange', { state: document.visibilityState });
        if (document.visibilityState === 'hidden') {
            timer.pause();
        } else {
            timer.resume();
        }
    });

    window.addEventListener('pagehide', () => {
        sendPageDuration();
    });

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    patchHistory(handleNavigation);

    document.addEventListener('click', (e) => {
        const el = findInteractive(e.target);
        if (!el) return;
        const px = e.pageX || e.clientX + window.scrollX;
        const py = e.pageY || e.clientY + window.scrollY;
        track('click', {
            x: e.clientX,
            y: e.clientY,
            px,
            py,
            pw: document.documentElement.scrollWidth,
            ph: document.documentElement.scrollHeight,
            ...describe(el),
        });
    });

    let lastHovered: HTMLElement | null = null;
    document.addEventListener('mouseover', (e) => {
        const el = findInteractive(e.target);
        if (!el || el === lastHovered) return;
        lastHovered = el;
        track('hover', describe(el));
    });
}
