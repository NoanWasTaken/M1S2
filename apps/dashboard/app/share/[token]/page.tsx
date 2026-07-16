'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type KpiData = {
    sessions:       number;
    pageViews:      number;
    bounceRate:     number;
    avgDuration:    string;
    sessionsDelta:  number;
    pageViewsDelta: number;
};

type TrafficPoint = {
    time:      string;
    sessions:  number;
    pageViews: number;
};

type PageRow = {
    url:      string;
    views:    number;
    visitors: number;
    clicks:   number;
};

type PublicData = {
    appId:    string;
    period:   string;
    kpis:     KpiData;
    traffic:  TrafficPoint[];
    topPages: PageRow[];
};

const PERIODS = ['24h', '7d', '30d', '90d'] as const;

function KpiBox({ label, value, delta }: { label: string; value: string | number; delta?: number }) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-wider text-white/50">{label}</span>
            <span className="font-mono text-2xl font-bold text-white">{value}</span>
            {delta !== undefined && delta !== 0 && (
                <span className={`text-xs font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                </span>
            )}
        </div>
    );
}

function SimpleChart({ data }: { data: TrafficPoint[] }) {
    if (data.length === 0) return null;

    const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
    const maxViews    = Math.max(...data.map((d) => d.pageViews), 1);

    return (
        <div className="flex h-24 items-end gap-0.5">
            {data.map((point, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                    <div
                        className="w-full rounded-t-sm bg-sky-400/60"
                        style={{ height: `${(point.pageViews / maxViews) * 100}%`, minHeight: 2 }}
                    />
                    <div
                        className="w-full rounded-t-sm bg-sky-400"
                        style={{ height: `${(point.sessions / maxSessions) * 100}%`, minHeight: 2 }}
                    />
                </div>
            ))}
        </div>
    );
}

export default function SharePage() {
    const params   = useParams<{ token: string }>();
    const token    = params?.token ?? '';
    const [data, setData]     = useState<PublicData | null>(null);
    const [period, setPeriod] = useState('24h');
    const [error, setError]   = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        fetch(`/api/v1/public/dashboard/${token}?period=${period}`)
            .then((r) => {
                if (!r.ok) throw new Error('invalid');
                return r.json() as Promise<PublicData>;
            })
            .then((d) => { setData(d); setError(false); })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [token, period]);

    useEffect(() => {
        const id = setInterval(() => {
            if (!token) return;
            fetch(`/api/v1/public/dashboard/${token}?period=${period}`)
                .then((r) => r.ok ? r.json() as Promise<PublicData> : Promise.reject())
                .then((d) => setData(d))
                .catch(() => {});
        }, 30_000);
        return () => clearInterval(id);
    }, [token, period]);

    return (
        <div className="min-h-screen bg-[#0d1220] px-6 py-10 text-white">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400 text-sm font-bold text-[#0d1220]">
                            A
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Analytix</p>
                            <p className="text-xs text-white/40">Dashboard public · lecture seule</p>
                        </div>
                    </div>

                    <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    period === p
                                        ? 'bg-sky-400 text-[#0d1220]'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {error ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <p className="text-lg font-semibold text-white">Lien invalide ou expiré</p>
                        <p className="text-sm text-white/40">Ce dashboard n'est plus accessible.</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                    </div>
                ) : data ? (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <KpiBox label="Sessions"       value={data.kpis.sessions}   delta={data.kpis.sessionsDelta} />
                            <KpiBox label="Pages vues"     value={data.kpis.pageViews}  delta={data.kpis.pageViewsDelta} />
                            <KpiBox label="Taux de rebond" value={`${data.kpis.bounceRate}%`} />
                            <KpiBox label="Durée moy."     value={data.kpis.avgDuration} />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                                </span>
                                <p className="text-xs font-medium text-white/70">Trafic — mis à jour toutes les 30s</p>
                            </div>
                            <SimpleChart data={data.traffic} />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Top pages</p>
                            <div className="flex flex-col gap-1">
                                {data.topPages.map((page) => {
                                    const maxViews = data.topPages[0]?.views ?? 1;
                                    return (
                                        <div key={page.url} className="flex items-center gap-3">
                                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">{page.url}</span>
                                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="h-full rounded-full bg-sky-400"
                                                    style={{ width: `${(page.views / maxViews) * 100}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right font-mono text-xs text-white">{page.views}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-center text-xs text-white/20">
                            Propulsé par Analytix · {data.appId}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
