'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { DeltaBadge } from '@/components/ui/delta-badge';
import type { KpiItem } from '@/lib/dashboard-api';

type KpiCardProps = KpiItem;

function kpiSubtext(id: KpiItem['id'], t: ReturnType<typeof useTranslations<'dashboard'>>, ratio?: string): string {
    switch (id) {
        case 'sessions':
            return t('vsPreviousPeriod');
        case 'pageViews':
            return t('pagesPerSessionRatio', { ratio: ratio ?? '0' });
        case 'bounceRate':
            return t('bounceObjective');
        case 'avgDuration':
            return t('perSession');
        default:
            return '';
    }
}

export function KpiCard({ id, value, delta, ratio }: KpiCardProps) {
    const t = useTranslations('dashboard');

    return (
        <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                    {t(id)}
                </span>
            </div>

            <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-text-primary">
                    {value}
                </span>
                <DeltaBadge value={delta} />
            </div>

            <p className="text-xs text-text-secondary">{kpiSubtext(id, t, ratio)}</p>
        </Card>
    );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {children}
        </div>
    );
}
