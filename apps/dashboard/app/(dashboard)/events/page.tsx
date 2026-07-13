'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApplications } from '@/providers/application-provider';
import { fetchEvents, exportAnalytics, type EventTypeRow, type RecentEvent } from '@/lib/analytics-api';
import { Card } from '@/components/ui/card';

const PERIODS = ['24h', '7d', '30d', '90d'] as const;

function SourceBadge({ source }: { source: 'browser' | 'server' }) {
    const t = useTranslations('analytics');
    const isBrowser = source === 'browser';
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isBrowser ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success'
                }`}
        >
            {isBrowser ? t('sourceBrowser') : t('sourceServer')}
        </span>
    );
}

// ─── Boutons export ──────────────────────────────────────────────────────────

function ExportButtons({ period, appId }: { period: string; appId?: string }) {
    const t = useTranslations('analytics');
    const [loadingCsv, setLoadingCsv] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);

    const handleExport = async (format: 'csv' | 'pdf') => {
        const setLoading = format === 'csv' ? setLoadingCsv : setLoadingPdf;
        setLoading(true);
        try {
            await exportAnalytics('events', format, period, appId);
        } catch (err) {
            console.error('[Export] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const btnClass =
        'flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                className={btnClass}
                disabled={loadingCsv}
                onClick={() => handleExport('csv')}
                title={t('exportCsv')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {loadingCsv ? t('exporting') : t('exportCsv')}
            </button>
            <button
                type="button"
                className={btnClass}
                disabled={loadingPdf}
                onClick={() => handleExport('pdf')}
                title={t('exportPdf')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {loadingPdf ? t('exporting') : t('exportPdf')}
            </button>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EventsPage() {
    const t = useTranslations('analytics');
    const tCommon = useTranslations('common');
    const { selectedAppId } = useApplications();

    const [period, setPeriod] = useState<string>('24h');
    const [types, setTypes] = useState<EventTypeRow[]>([]);
    const [recent, setRecent] = useState<RecentEvent[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await fetchEvents(period, selectedAppId ?? undefined);
            setTypes(data.types);
            setRecent(data.recent);
            setTotal(data.total);
        } catch {
            setTypes([]);
            setRecent([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [period, selectedAppId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, [load]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-text-primary">{t('eventsTitle')}</h1>
                    <span className="rounded-full bg-bg-card px-2.5 py-0.5 font-mono text-xs text-text-secondary">
                        {total}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center rounded-lg border border-border-subtle p-0.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === p
                                        ? 'bg-accent text-[#05070d]'
                                        : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <ExportButtons period={period} appId={selectedAppId ?? undefined} />
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-text-secondary">{t('loading')}</p>
            ) : (
                <>
                    <Card className="flex flex-col gap-4">
                        <h2 className="text-sm font-semibold text-text-primary">{t('byType')}</h2>

                        {types.length === 0 ? (
                            <p className="text-sm text-text-secondary">{t('noEvent')}</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {types.map((row) => {
                                    const share = total > 0 ? (row.count / total) * 100 : 0;
                                    return (
                                        <div key={row.type} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono text-xs text-text-primary">{row.type}</code>
                                                    {row.browser > 0 && <SourceBadge source="browser" />}
                                                    {row.server > 0 && <SourceBadge source="server" />}
                                                </div>
                                                <span className="font-mono text-sm text-text-primary">{row.count}</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
                                                <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                            </span>
                            <h2 className="text-sm font-semibold text-text-primary">{t('latestEvents')}</h2>
                        </div>

                        {recent.length === 0 ? (
                            <p className="text-sm text-text-secondary">{t('noEvent')}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead>
                                        <tr className="text-xs uppercase tracking-wider text-text-secondary">
                                            <th className="pb-2 text-left font-medium">{t('type')}</th>
                                            <th className="pb-2 text-left font-medium">{t('page')}</th>
                                            <th className="pb-2 text-left font-medium">{t('source')}</th>
                                            <th className="pb-2 text-right font-medium">{t('when')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent.map((e, i) => (
                                            <tr key={`${e.occurredAt}-${i}`} className="border-t border-border-subtle">
                                                <td className="py-2.5">
                                                    <code className="font-mono text-xs text-text-primary">{e.type}</code>
                                                </td>
                                                <td className="max-w-xs py-2.5">
                                                    <span className="block truncate font-mono text-xs text-text-secondary">
                                                        {e.url ?? tCommon('notAvailable')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5">
                                                    <SourceBadge source={e.source} />
                                                </td>
                                                <td className="py-2.5 text-right font-mono text-xs text-text-tertiary">
                                                    {new Date(e.occurredAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}