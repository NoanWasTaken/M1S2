'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApplications } from '@/providers/application-provider';
import { fetchFunnels, fetchFunnelStats, type FunnelSummary, type FunnelAnalytics } from '@/lib/funnel-api';
import { FunnelChart } from '@/components/analytics/funnel-chart';
import { Card } from '@/components/ui/card';

const PERIODS = ['24h', '7d', '30d', '90d'] as const;

export default function FunnelAnalyticsPage() {
    const t = useTranslations('funnel');
    const { selectedApp, selectedAppId } = useApplications();

    const [period, setPeriod] = useState<string>('7d');
    const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
    const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingFunnels, setLoadingFunnels] = useState(true);

    useEffect(() => {
        if (!selectedApp) return;
        setLoadingFunnels(true);
        fetchFunnels(selectedApp._id)
            .then((data) => {
                setFunnels(data);
                setSelectedFunnelId(data[0]?.funnelId ?? '');
            })
            .catch(() => setFunnels([]))
            .finally(() => setLoadingFunnels(false));
    }, [selectedApp]);

    const load = useCallback(async () => {
        if (!selectedFunnelId) return;
        setLoading(true);
        try {
            const data = await fetchFunnelStats(selectedFunnelId, period, selectedAppId ?? undefined);
            setAnalytics(data);
        } catch {
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    }, [selectedFunnelId, period, selectedAppId]);

    useEffect(() => {
        load();
    }, [load]);

    const selectClass =
        'rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors';

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-text-primary">{t('title')}</h1>

                <div className="flex flex-wrap items-center gap-3">
                    {loadingFunnels ? (
                        <span className="text-sm text-text-secondary">{t('loading')}</span>
                    ) : funnels.length === 0 ? (
                        <span className="text-sm text-text-secondary">{t('noFunnel')}</span>
                    ) : (
                        <select
                            value={selectedFunnelId}
                            onChange={(e) => setSelectedFunnelId(e.target.value)}
                            className={selectClass}
                        >
                            {funnels.map((f) => (
                                <option key={f.funnelId} value={f.funnelId}>
                                    {f.comment}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="flex items-center rounded-lg border border-border-subtle p-0.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    period === p
                                        ? 'bg-accent text-[#05070d]'
                                        : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {funnels.length === 0 && !loadingFunnels ? (
                <Card>
                    <p className="text-sm text-text-secondary">{t('noFunnel')}</p>
                </Card>
            ) : loading ? (
                <Card>
                    <p className="text-sm text-text-secondary">{t('loading')}</p>
                </Card>
            ) : analytics ? (
                <Card className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-text-primary">{analytics.funnel.comment}</h2>
                        <span className="text-xs text-text-tertiary font-mono">{analytics.funnel.funnelId}</span>
                    </div>
                    <FunnelChart
                        steps={analytics.steps}
                        totalEntrants={analytics.totalEntrants}
                        totalConverted={analytics.totalConverted}
                    />
                </Card>
            ) : null}
        </div>
    );
}
