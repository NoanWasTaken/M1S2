'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApplications } from '@/providers/application-provider';
import { useDashboardStream } from '@/lib/dashboard-stream';
import {
    fetchPages,
    fetchTimeseries,
    type PageRow,
    type PagesTotals,
    type ClickedElement,
    type SeriesPoint,
} from '@/lib/analytics-api';
import { AnalyticsChart, colorOf } from '@/components/dashboard/analytics-chart';
import { Card } from '@/components/ui/card';
import { DateInput } from '@/components/ui/date-input';

const PERIODS = ['24h', '7d', '30d', '90d'] as const;
const ALL_METRICS = ['pageview', 'click', 'hover', 'page_exit', 'tabchange'] as const;
type Metric = (typeof ALL_METRICS)[number];

function formatDuration(seconds: number, t: ReturnType<typeof useTranslations<'analytics'>>): string {
    if (!seconds) return t('durationZero');
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? t('durationMinutesSeconds', { minutes: m, seconds: s }) : t('durationSecondsOnly', { seconds: s });
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <Card className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-text-secondary">{label}</span>
            <span className="font-mono text-2xl font-bold text-text-primary">{value}</span>
            {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
        </Card>
    );
}

function Toggle({
    active,
    onClick,
    color,
    children,
}: {
    active: boolean;
    onClick: () => void;
    color?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${active
                    ? 'border-accent/40 bg-accent/10 text-text-primary'
                    : 'border-border-subtle text-text-tertiary hover:text-text-secondary'
                }`}
        >
            {color && (
                <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: active ? color : 'transparent', border: `1px solid ${color}` }}
                />
            )}
            <span className="max-w-[220px] truncate">{children}</span>
        </button>
    );
}

function TopElements({ elements }: { elements: ClickedElement[] }) {
    const t = useTranslations('analytics');
    const max = Math.max(...elements.map((e) => e.clicks), 1);

    const natureStyle: Record<ClickedElement['nature'], string> = {
        navigation: 'bg-accent/10 text-accent',
        action: 'bg-success/10 text-success',
        unknown: 'bg-bg-hover text-text-tertiary',
    };

    return (
        <Card className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text-primary">{t('topElements')}</h2>
            {elements.length === 0 ? (
                <p className="text-sm text-text-secondary">{t('noClick')}</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {elements.map((el, i) => (
                        <div key={`${el.label}-${i}`} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-xs text-text-primary">{el.label}</span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${natureStyle[el.nature]}`}>
                                        {t(`nature_${el.nature}`)}
                                    </span>
                                </div>
                                <span className="shrink-0 font-mono text-xs text-text-primary">{el.clicks}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${(el.clicks / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

export default function PagesPage() {
    const t = useTranslations('analytics');
    const { selectedAppId } = useApplications();

    const [period, setPeriod] = useState<string>('24h');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const useCustomRange = Boolean(from && to);

    const [pages, setPages] = useState<PageRow[]>([]);
    const [totals, setTotals] = useState<PagesTotals>({ views: 0, visitors: 0, clicks: 0, avgDuration: 0 });
    const [topElements, setTopElements] = useState<ClickedElement[]>([]);
    const [points, setPoints] = useState<SeriesPoint[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>(['pageview', 'click']);

    const loadTable = useCallback(async () => {
        try {
            const data = await fetchPages(period, selectedAppId ?? undefined);
            setPages(data.pages);
            setTotals(data.totals);
            setTopElements(data.topElements);
        } catch {
            setPages([]);
            setTopElements([]);
            setTotals({ views: 0, visitors: 0, clicks: 0, avgDuration: 0 });
        } finally {
            setLoading(false);
        }
    }, [period, selectedAppId]);

    const loadChart = useCallback(async () => {
        try {
            const data = await fetchTimeseries(period, {
                appId: selectedAppId ?? undefined,
                from: useCustomRange ? from : undefined,
                to: useCustomRange ? to : undefined,
                urls: selectedUrls,
                types: metrics,
            });
            setPoints(data.points);
        } catch {
            setPoints([]);
        }
    }, [period, selectedAppId, from, to, useCustomRange, selectedUrls, metrics]);

    useEffect(() => {
        loadTable();
    }, [loadTable]);

    useEffect(() => {
        loadChart();
    }, [loadChart]);

    useDashboardStream({
        onUpdate: () => {
            loadTable();
            loadChart();
        },
    });

    const toggleUrl = (url: string) =>
        setSelectedUrls((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

    const toggleMetric = (metric: Metric) =>
        setMetrics((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]));

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return pages;
        return pages.filter((p) => p.url.toLowerCase().includes(q));
    }, [pages, search]);

    const maxViews = Math.max(...pages.map((p) => p.views), 1);

    const inputClass =
        'rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none transition-colors';

    const dateClass = `${inputClass} min-w-[9.5rem]`;

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-text-primary">{t('pagesTitle')}</h1>

                <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex flex-wrap items-center rounded-lg border border-border-subtle p-0.5 ${useCustomRange ? 'opacity-40' : ''}`}>
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => {
                                    setPeriod(p);
                                    setFrom('');
                                    setTo('');
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === p && !useCustomRange
                                        ? 'bg-accent text-[#05070d]'
                                        : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="date-range flex-wrap">
                        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} className={dateClass} />
                        <span className="text-xs text-text-tertiary">→</span>
                        <DateInput value={to} onChange={(e) => setTo(e.target.value)} className={dateClass} />
                        {useCustomRange && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFrom('');
                                    setTo('');
                                }}
                                className="text-xs text-danger hover:underline"
                            >
                                {t('resetRange')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-text-secondary">{t('loading')}</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <KpiCard label={t('views')} value={totals.views} hint={t('pageviewsHint')} />
                        <KpiCard label={t('visitors')} value={totals.visitors} hint={t('uniqueHint')} />
                        <KpiCard label={t('clicks')} value={totals.clicks} hint={t('clicksHint')} />
                        <KpiCard label={t('avgDuration')} value={formatDuration(totals.avgDuration, t)} hint={t('durationHint')} />
                    </div>

                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                            </span>
                            <h2 className="text-sm font-semibold text-text-primary">{t('chartTitle')}</h2>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('metricsLabel')}</span>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_METRICS.map((metric, i) => (
                                    <Toggle
                                        key={metric}
                                        active={metrics.includes(metric)}
                                        onClick={() => toggleMetric(metric)}
                                        color={colorOf(metric, i)}
                                    >
                                        {t(`metrics.${metric}`)}
                                    </Toggle>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                                {selectedUrls.length === 0 ? t('allPagesActive') : t('filteredPages')}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {pages.map((p) => (
                                    <Toggle key={p.url} active={selectedUrls.includes(p.url)} onClick={() => toggleUrl(p.url)}>
                                        {p.url.replace(/^https?:\/\//, '')}
                                    </Toggle>
                                ))}
                                {selectedUrls.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUrls([])}
                                        className="text-xs text-danger hover:underline"
                                    >
                                        {t('clearPages')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {metrics.length === 0 ? (
                            <p className="py-12 text-center text-sm text-text-secondary">{t('pickMetric')}</p>
                        ) : points.length === 0 ? (
                            <p className="py-12 text-center text-sm text-text-secondary">{t('noData')}</p>
                        ) : (
                            <AnalyticsChart data={points} series={metrics} />
                        )}
                    </Card>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="flex flex-col gap-4 lg:col-span-2">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('searchPage')}
                                className="w-full max-w-sm rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                            />

                            {visible.length === 0 ? (
                                <Card><p className="text-sm text-text-secondary">{t('noPage')}</p></Card>
                            ) : (
                                <Card className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-sm">
                                        <thead>
                                            <tr className="text-xs uppercase tracking-wider text-text-secondary">
                                                <th className="pb-2 text-left font-medium">{t('page')}</th>
                                                <th className="pb-2 text-right font-medium">{t('views')}</th>
                                                <th className="pb-2 text-right font-medium">{t('clicks')}</th>
                                                <th className="pb-2 text-right font-medium">{t('hovers')}</th>
                                                <th className="pb-2 text-right font-medium">{t('duration')}</th>
                                                <th className="pb-2 text-right font-medium">{t('engagement')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visible.map((p) => (
                                                <tr
                                                    key={p.url}
                                                    onClick={() => toggleUrl(p.url)}
                                                    className={`cursor-pointer border-t border-border-subtle transition-colors hover:bg-bg-hover ${selectedUrls.includes(p.url) ? 'bg-bg-active' : ''
                                                        }`}
                                                >
                                                    <td className="max-w-[220px] py-3">
                                                        <span className="block truncate font-mono text-xs text-text-primary">{p.url}</span>
                                                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
                                                            <div
                                                                className="h-full rounded-full bg-accent/60"
                                                                style={{ width: `${(p.views / maxViews) * 100}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right font-mono text-text-primary">{p.views}</td>
                                                    <td className="py-3 text-right font-mono text-text-secondary">{p.clicks}</td>
                                                    <td className="py-3 text-right font-mono text-text-secondary">{p.hovers}</td>
                                                    <td className="py-3 text-right font-mono text-text-secondary">{formatDuration(p.avgDuration, t)}</td>
                                                    <td className="py-3 text-right">
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${p.engagement >= 1
                                                                    ? 'bg-success/10 text-success'
                                                                    : p.engagement > 0
                                                                        ? 'bg-warning/10 text-warning'
                                                                        : 'bg-bg-hover text-text-tertiary'
                                                                }`}
                                                        >
                                                            {p.engagement.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </div>

                        <TopElements elements={topElements} />
                    </div>
                </>
            )}
        </div>
    );
}