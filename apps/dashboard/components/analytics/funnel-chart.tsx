'use client';

import { useTranslations } from 'next-intl';
import type { FunnelStepResult } from '@/lib/funnel-api';

type Props = {
    steps: FunnelStepResult[];
    totalEntrants: number;
    totalConverted: number;
};

function rateColor(rate: number): string {
    if (rate >= 0.7) return 'text-success';
    if (rate >= 0.4) return 'text-warning';
    return 'text-danger';
}

function rateBarColor(rate: number): string {
    if (rate >= 0.7) return 'bg-success';
    if (rate >= 0.4) return 'bg-warning';
    return 'bg-danger';
}

export function FunnelChart({ steps, totalEntrants, totalConverted }: Props) {
    const t = useTranslations('funnel');

    if (steps.length === 0) {
        return <p className="text-sm text-text-secondary">{t('noData')}</p>;
    }

    const maxSessions = steps[0]?.sessions ?? 1;
    const globalConversion = totalEntrants > 0
        ? Math.round((totalConverted / totalEntrants) * 1000) / 10
        : 0;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-text-secondary">{t('entrants')}</span>
                    <span className="font-mono text-2xl font-bold text-text-primary">{totalEntrants}</span>
                </div>
                <div className="h-8 w-px bg-border-subtle" />
                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-text-secondary">{t('converted')}</span>
                    <span className="font-mono text-2xl font-bold text-success">{totalConverted}</span>
                </div>
                <div className="h-8 w-px bg-border-subtle" />
                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-text-secondary">{t('conversionRate')}</span>
                    <span className={`font-mono text-2xl font-bold ${rateColor(globalConversion / 100)}`}>
                        {globalConversion}%
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {steps.map((step, idx) => {
                    const barPct = maxSessions > 0 ? (step.sessions / maxSessions) * 100 : 0;
                    const isFirst = idx === 0;

                    return (
                        <div key={step.tagId} className="flex flex-col gap-1.5">
                            {!isFirst && (
                                <div className="flex items-center gap-3 pl-4">
                                    <div className="h-4 w-px bg-border-subtle" />
                                    <span className={`text-xs font-medium ${rateColor(step.conversionRate)}`}>
                                        ↓ {Math.round(step.conversionRate * 1000) / 10}% {t('conversionRate').toLowerCase()}
                                        {step.dropRate > 0 && (
                                            <span className="ml-2 text-text-tertiary">
                                                ({Math.round(step.dropRate * 1000) / 10}% {t('dropRate').toLowerCase()})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-card font-mono text-xs text-text-secondary">
                                    {step.position}
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-text-primary">
                                            {step.comment}
                                        </span>
                                        <span className="shrink-0 font-mono text-sm text-text-primary">
                                            {step.sessions.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-hover">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isFirst ? 'bg-accent' : rateBarColor(step.conversionRate)}`}
                                            style={{ width: `${barPct}%` }}
                                        />
                                    </div>
                                    <span className="font-mono text-[10px] text-text-tertiary">
                                        {step.tagId}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
