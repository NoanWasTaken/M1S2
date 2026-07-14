'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';

type AlertThreshold = {
    appId: string;
    threshold: number;
    enabled: boolean;
    cooldownMs: number;
};

type Props = {
    appId: string;
};

export function AlertSettingsSection({ appId }: Props) {
    const t = useTranslations('alert');
    const [data, setData] = useState<AlertThreshold | null>(null);
    const [threshold, setThreshold] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [cooldownMin, setCooldownMin] = useState('5');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.get<{ threshold: AlertThreshold | null }>(`/api/v1/alerts/${appId}`)
            .then((res) => {
                const d = res.data.threshold;
                if (d) {
                    setData(d);
                    setThreshold(String(d.threshold));
                    setEnabled(d.enabled);
                    setCooldownMin(String(Math.round(d.cooldownMs / 60_000)));
                }
            })
            .catch(() => {});
    }, [appId]);

    const handleSave = async () => {
        const parsed = parseInt(threshold, 10);
        if (!parsed || parsed < 1) return;
        setSaving(true);
        try {
            const res = await api.put<{ threshold: AlertThreshold }>(`/api/v1/alerts/${appId}`, {
                appId,
                threshold: parsed,
                enabled,
                cooldownMs: parseInt(cooldownMin, 10) * 60_000,
            });
            setData(res.data.threshold);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        await api.delete(`/api/v1/alerts/${appId}`);
        setData(null);
        setThreshold('');
        setEnabled(true);
        setCooldownMin('5');
    };

    const inputClass =
        'w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none';

    return (
        <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">{t('settingsTitle')}</h3>
                {data && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="text-xs text-danger hover:underline"
                    >
                        {t('deleteAlert')}
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">{t('thresholdLabel')}</span>
                    <input
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="ex: 50"
                        className={inputClass}
                    />
                    <span className="text-xs text-text-tertiary">{t('thresholdHint')}</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">{t('cooldownLabel')}</span>
                    <input
                        type="number"
                        min="0"
                        value={cooldownMin}
                        onChange={(e) => setCooldownMin(e.target.value)}
                        className={inputClass}
                    />
                    <span className="text-xs text-text-tertiary">{t('cooldownHint')}</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        className="rounded border-border-subtle"
                    />
                    <span className="text-text-secondary">{t('enabledLabel')}</span>
                </label>
            </div>

            <button
                type="button"
                disabled={saving || !threshold}
                onClick={handleSave}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#05070d] disabled:opacity-50"
            >
                {saved ? t('saved') : saving ? t('saving') : t('save')}
            </button>
        </Card>
    );
}
