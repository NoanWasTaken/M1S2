'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';

type PlatformStats = {
    companies: number;
    validatedCompanies: number;
    pendingCompanies: number;
    applications: number;
    users: number;
    onlineUsers: number;
    connections: number;
    activeVisitors: number;
    eventsLastHour: number;
};

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/realtime/stream`;

function StatCard({
    label,
    value,
    hint,
    live,
}: {
    label: string;
    value: number | string;
    hint?: string;
    live?: boolean;
}) {
    return (
        <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {live && (
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                )}
                <span className="text-xs uppercase tracking-wider text-text-secondary">{label}</span>
            </div>
            <span className="font-mono text-3xl font-bold text-text-primary">{value}</span>
            {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
        </Card>
    );
}

export default function AdminStatsPage() {
    const t = useTranslations('admin');
    const [stats, setStats] = useState<PlatformStats | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get<PlatformStats>('/api/v1/admin/stats');
            setStats(res.data);
        } catch {
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const es = new EventSource(SSE_URL, { withCredentials: true });

        es.addEventListener('platform:presence', (e) => {
            const { onlineUsers, connections } = JSON.parse((e as MessageEvent).data) as {
                onlineUsers: number;
                connections: number;
            };
            setStats((prev) => (prev ? { ...prev, onlineUsers, connections } : prev));
        });

        es.addEventListener('company:pending', () => load());
        es.addEventListener('company:pending-count', () => load());

        return () => es.close();
    }, [load]);

    useEffect(() => {
        const id = setInterval(load, 15000);
        return () => clearInterval(id);
    }, [load]);

    if (!stats) {
        return <div className="p-6"><p className="text-sm text-text-secondary">{t('loading')}</p></div>;
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-xl font-semibold text-text-primary">{t('statsTitle')}</h1>

            <div>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">{t('liveSection')}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard
                        live
                        label={t('onlineUsers')}
                        value={stats.onlineUsers}
                        hint={t('connectionsHint', { count: stats.connections })}
                    />
                    <StatCard
                        live
                        label={t('activeVisitors')}
                        value={stats.activeVisitors}
                        hint={t('activeVisitorsHint')}
                    />
                    <StatCard
                        live
                        label={t('eventsLastHour')}
                        value={stats.eventsLastHour}
                        hint={t('eventsHint')}
                    />
                </div>
            </div>

            <div>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">{t('platformSection')}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <StatCard
                        label={t('connectedSites')}
                        value={stats.applications}
                        hint={t('connectedSitesHint')}
                    />
                    <StatCard
                        label={t('companiesCount')}
                        value={stats.companies}
                        hint={t('validatedHint', { count: stats.validatedCompanies })}
                    />
                    <StatCard
                        label={t('pendingCompanies')}
                        value={stats.pendingCompanies}
                        hint={t('pendingHint')}
                    />
                    <StatCard label={t('webmastersCount')} value={stats.users} />
                </div>
            </div>
        </div>
    );
}