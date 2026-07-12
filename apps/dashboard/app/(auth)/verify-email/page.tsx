'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type State = 'checking' | 'success' | 'error';

function VerifyEmailContent() {
    const t = useTranslations('invitation');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [state, setState] = useState<State>('checking');
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setState('error');
            return;
        }
        api
            .get<{ verified: boolean; email: string }>(`/api/v1/auth/verify-email?token=${token}`)
            .then((res) => {
                setEmail(res.data.email);
                setState('success');
            })
            .catch(() => setState('error'));
    }, [token]);

    if (state === 'checking') {
        return <p className="text-center text-sm text-text-secondary">{tCommon('loading')}</p>;
    }

    if (state === 'error') {
        return (
            <div className="space-y-4">
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {t('verifyFailed')}
                </div>
                <Link href="/login" className="block text-center text-sm text-accent hover:underline">
                    {t('backToLogin')}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">{t('verifySuccess')}</p>
                {email && <p className="font-mono text-xs text-text-secondary">{email}</p>}
            </div>

            <Button className="w-full" size="lg" onClick={() => router.push('/login')}>
                {t('goToPlatform')}
            </Button>
        </div>
    );
}

export default function VerifyEmailPage() {
    const t = useTranslations('invitation');
    const tCommon = useTranslations('common');

    return (
        <Card className="space-y-6">
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-lg font-semibold text-text-primary">{t('verifyTitle')}</h1>
            </div>
            <Suspense fallback={<p className="text-center text-sm text-text-secondary">{tCommon('loading')}</p>}>
                <VerifyEmailContent />
            </Suspense>
        </Card>
    );
}