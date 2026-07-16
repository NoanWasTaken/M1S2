'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useGlobeStream, type GlobePoint } from '@/lib/use-globe-stream';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

type GlobeInstance = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function GlobePage() {
    const t = useTranslations('globe');
    const { points, totalActive, connected, loading } = useGlobeStream();

    const globeRef = useRef<GlobeInstance>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [hovered, setHovered] = useState<GlobePoint | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const onGlobeReady = useCallback(() => {
        const g = globeRef.current;
        if (!g) return;
        g.controls().autoRotate = true;
        g.controls().autoRotateSpeed = 0.4;
        g.controls().enableZoom = true;
        const busiest = points[0];
        g.pointOfView(
            busiest ? { lat: busiest.lat, lng: busiest.lng, altitude: 2.2 } : { lat: 25, lng: 0, altitude: 2.4 },
            0,
        );
    }, [points]);

    useEffect(() => {
        const g = globeRef.current;
        if (!g?.controls) return;
        g.controls().autoRotate = hovered === null;
    }, [hovered]);

    const maxVisitors = useMemo(
        () => points.reduce((m, p) => Math.max(m, p.visitors), 1),
        [points],
    );

    return (
        <div ref={containerRef} className="relative h-full min-h-0 w-full flex-1 overflow-hidden bg-black">
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-6">
                <div>
                    <h1 className="text-lg font-semibold text-white">{t('title')}</h1>
                    <p className="mt-1 text-sm text-white/60">{t('subtitle')}</p>
                </div>
                <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'animate-ping bg-emerald-400/70' : 'bg-white/30'}`} />
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/40'}`} />
                        </span>
                        <span className="text-xs text-white/70">{connected ? t('live') : t('connecting')}</span>
                    </div>
                    <div className="h-4 w-px bg-white/15" />
                    <div className="text-sm text-white">
                        <span className="font-semibold">{totalActive}</span>{' '}
                        <span className="text-white/60">{t('activeVisitors')}</span>
                    </div>
                </div>
            </div>

            {hovered && (
                <div className="pointer-events-none absolute bottom-6 left-6 z-10 min-w-56 rounded-xl border border-white/10 bg-black/70 p-4 backdrop-blur">
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

            {!loading && points.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <p className="rounded-lg border border-white/10 bg-black/60 px-4 py-2 text-sm text-white/70">
                        {t('noVisitors')}
                    </p>
                </div>
            )}

            {size.width > 0 && (
                <Globe
                    ref={globeRef}
                    width={size.width}
                    height={size.height}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    onGlobeReady={onGlobeReady}
                    pointsData={points}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor={() => '#38bdf8'}
                    pointAltitude={(d: object) => 0.01 + ((d as GlobePoint).visitors / maxVisitors) * 0.25}
                    pointRadius={0.4}
                    pointsMerge={false}
                    pointLabel={(d: object) => {
                        const p = d as GlobePoint;
                        return `${p.name}: ${p.visitors}`;
                    }}
                    onPointHover={(d: object | null) => setHovered((d as GlobePoint) ?? null)}
                    ringsData={points}
                    ringLat="lat"
                    ringLng="lng"
                    ringColor={() => (tGradient: number) => `rgba(56,189,248,${1 - tGradient})`}
                    ringMaxRadius={(d: object) => 2 + Math.min((d as GlobePoint).visitors, 8)}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={1400}
                />
            )}
        </div>
    );
}