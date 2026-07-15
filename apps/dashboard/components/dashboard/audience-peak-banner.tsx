'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AudiencePeakAlert } from '@/lib/dashboard-stream';

type Props = {
    alert: AudiencePeakAlert | null;
};

export function AudiencePeakBanner({ alert }: Props) {
    const t = useTranslations('alert');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (alert) {
            setVisible(true);
        } else {
            const id = setTimeout(() => setVisible(false), 400);
            return () => clearTimeout(id);
        }
    }, [alert]);

    if (!visible) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-warning/30 bg-bg-card px-4 py-3 shadow-xl transition-all duration-300 ${alert ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
            <span className="relative flex h-3 w-3 shrink-0 translate-y-0.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-warning" />
            </span>
            <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-text-primary">{t('peakTitle')}</p>
                <p className="text-xs text-text-secondary">
                    {t('peakBody', {
                        current: alert?.currentVisitors ?? 0,
                        threshold: alert?.threshold ?? 0,
                    })}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-text-tertiary">
                    {alert?.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ''}
                </p>
            </div>
        </div>
    );
}
