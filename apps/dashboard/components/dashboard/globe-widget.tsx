'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useGlobeStream, type GlobePoint } from '@/lib/use-globe-stream';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

function GlobeView({
    points,
    interactive,
    onHover,
}: {
    points: GlobePoint[];
    interactive: boolean;
    onHover?: (p: GlobePoint | null) => void;
}) {
    const globeRef = useRef<GlobeMethods>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let raf = 0;
        const update = () => {
            // Read on the next frame so the grid layout has settled — this is
            // what prevents the WebGL canvas from initialising at size 0 and
            // staying black until the next resize.
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const w = el.clientWidth;
                // If the parent doesn't constrain height (some static layouts don't),
                // fall back to the element's own box or a sensible default so the
                // WebGL canvas never initialises at height 0 (which renders black).
                const h = el.clientHeight || el.offsetHeight || 360;
                if (w > 0 && h > 0) {
                    setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
                }
            });
        };

        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        // Also catch the case where the widget mounts hidden then becomes visible.
        const onWindowResize = () => update();
        window.addEventListener('resize', onWindowResize);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener('resize', onWindowResize);
        };
    }, []);

    const maxVisitors = useMemo(() => points.reduce((m, p) => Math.max(m, p.visitors), 1), [points]);

    const onReady = useCallback(() => {
        const g = globeRef.current;
        if (!g) return;
        g.controls().autoRotate = true;
        g.controls().autoRotateSpeed = interactive ? 0.4 : 0.8;
        g.controls().enableZoom = interactive;
        const busiest = points[0];
        g.pointOfView(
            busiest ? { lat: busiest.lat, lng: busiest.lng, altitude: 2.2 } : { lat: 25, lng: 0, altitude: 2.4 },
            0,
        );
    }, [points, interactive]);

    return (
        <div ref={containerRef} className="h-full w-full">
            {size.width > 0 && size.height > 0 && (
                <Globe
                    key={`${size.width}x${size.height}`}
                    ref={globeRef}
                    width={size.width}
                    height={size.height}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    onGlobeReady={onReady}
                    pointsData={points}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor={() => '#38bdf8'}
                    pointAltitude={(d: object) => 0.01 + ((d as GlobePoint).visitors / maxVisitors) * 0.25}
                    pointRadius={interactive ? 0.4 : 0.6}
                    pointsMerge={false}
                    pointLabel={(d: object) => {
                        const p = d as GlobePoint;
                        return `${p.name}: ${p.visitors}`;
                    }}
                    onPointHover={interactive ? (d: object | null) => onHover?.((d as GlobePoint) ?? null) : undefined}
                    ringsData={points}
                    ringLat="lat"
                    ringLng="lng"
                    ringColor={() => (tt: number) => `rgba(56,189,248,${1 - tt})`}
                    ringMaxRadius={(d: object) => 2 + Math.min((d as GlobePoint).visitors, 8)}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={1400}
                />
            )}
        </div>
    );
}

function LiveBadge({ connected, total }: { connected: boolean; total: number }) {
    const t = useTranslations('globe');
    return (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
            <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'animate-ping bg-emerald-400/70' : 'bg-white/30'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/40'}`} />
            </span>
            <span className="text-xs text-white/70">{connected ? t('live') : t('connecting')}</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-sm text-white">
                <span className="font-semibold">{total}</span> <span className="text-white/60">{t('activeVisitors')}</span>
            </span>
        </div>
    );
}

function GlobeModal({
    points,
    total,
    connected,
    onClose,
}: {
    points: GlobePoint[];
    total: number;
    connected: boolean;
    onClose: () => void;
}) {
    const t = useTranslations('globe');
    const [hovered, setHovered] = useState<GlobePoint | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const top = useMemo(() => [...points].sort((a, b) => b.visitors - a.visitors).slice(0, 8), [points]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-start justify-between p-6">
                <div>
                    <h2 className="text-lg font-semibold text-white">{t('title')}</h2>
                    <p className="mt-1 text-sm text-white/60">{t('subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveBadge connected={connected} total={total} />
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:bg-white/10"
                    >
                        {t('collapse')}
                    </button>
                </div>
            </div>

            <div className="relative flex-1">
                <GlobeView points={points} interactive onHover={setHovered} />

                {hovered && (       
                    <div className="pointer-events-none absolute bottom-6 left-6 min-w-56 rounded-xl border border-white/10 bg-black/70 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-wider text-white/50">{t('country')}</p>
                        <p className="mt-0.5 text-base font-semibold text-white">{hovered.name}</p>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-sky-400">{hovered.visitors}</span>
                            <span className="text-sm text-white/60">
                                {hovered.visitors > 1 ? t('activeVisitorsPlural') : t('activeVisitorsSingular')}
                            </span>
                        </div>
                    </div>
                )}

                {top.length > 0 && (
                    <div className="absolute right-6 top-6 w-56 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">{t('topCountries')}</p>
                        <ul className="flex flex-col gap-1.5">
                            {top.map((p) => (
                                <li key={p.country} className="flex items-center justify-between text-sm">
                                    <span className="truncate text-white/80">{p.name}</span>
                                    <span className="font-semibold text-sky-400">{p.visitors}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {points.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <p className="rounded-lg border border-white/10 bg-black/60 px-4 py-2 text-sm text-white/70">{t('noVisitors')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function GlobeWidget() {
    const t = useTranslations('globe');
    const { points, totalActive, connected, loading } = useGlobeStream();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative h-[380px] w-full overflow-hidden rounded-lg bg-black">
            <GlobeView points={points} interactive={false} />

            {/* Overlay: live count */}
            <div className="pointer-events-none absolute left-3 top-3">
                <LiveBadge connected={connected} total={totalActive} />
            </div>

            {/* Expand button */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 p-2 text-white/80 backdrop-blur transition-colors hover:bg-white/10"
                aria-label={t('expand')}
                title={t('expand')}
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                </svg>
            </button>

            {!loading && points.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                    <p className="rounded-md border border-white/10 bg-black/60 px-3 py-1 text-xs text-white/70">{t('noVisitors')}</p>
                </div>
            )}

            {open && (
                <GlobeModal points={points} total={totalActive} connected={connected} onClose={() => setOpen(false)} />
            )}
        </div>
    );
}

export default GlobeWidget;