'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api-client';
import { TeamSection } from '@/components/settings/team-section';

export default function TeamPage() {
    const t = useTranslations('team');
    const tCommon = useTranslations('common');
    const { user } = useAuth();
    const [meId, setMeId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const isOwner = user?.role === 'webmaster' && user?.teamRole === 'owner';

    useEffect(() => {
        api
            .get('/api/v1/auth/me')
            .then((r) => setMeId(r.data.user._id))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-xl font-semibold text-text-primary">{t('pageTitle')}</h1>

            {loading ? (
                <p className="text-sm text-text-secondary">{tCommon('loading')}</p>
            ) : isOwner ? (
                <TeamSection currentUserId={meId} />
            ) : (
                <div className="rounded-lg border border-border-subtle bg-bg-card p-6 text-center">
                    <p className="text-sm font-medium text-text-primary">{t('ownerOnlyTitle')}</p>
                    <p className="mt-1 text-sm text-text-secondary">{t('ownerOnlyText')}</p>
                </div>
            )}
        </div>
    );
}