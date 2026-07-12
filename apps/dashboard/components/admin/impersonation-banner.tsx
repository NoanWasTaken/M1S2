'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getImpersonatedEmail, stopImpersonating } from '@/lib/admin-api';

export function ImpersonationBanner() {
    const t = useTranslations('admin');
    const [email, setEmail] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setEmail(getImpersonatedEmail());
    }, []);

    if (!email) return null;

    const handleStop = async () => {
        setBusy(true);
        try {
            await stopImpersonating();
        } catch {
        }
        window.location.href = '/admin/users';
    };

    return (
        <div className="flex items-center justify-between gap-3 bg-warning/15 px-4 py-2 text-xs font-medium text-warning">
            <span>{t('impersonatingAs', { email })}</span>
            <button
                type="button"
                onClick={handleStop}
                disabled={busy}
                className="rounded-md border border-warning/40 px-2.5 py-1 transition-colors hover:bg-warning/10 disabled:opacity-50"
            >
                {t('stopImpersonating')}
            </button>
        </div>
    );
}