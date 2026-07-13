'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

type FormValues = { password: string; confirm: string };

type InvitationDetails = { email: string; companyName: string };

function AcceptInvitationForm() {
    const t = useTranslations('invitation');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [details, setDetails] = useState<InvitationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const schema = useMemo(
        () =>
            z
                .object({
                    password: z.string().min(8, t('passwordTooShort')),
                    confirm: z.string(),
                })
                .refine((d) => d.password === d.confirm, {
                    message: t('passwordsDoNotMatch'),
                    path: ['confirm'],
                }),
        [t],
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: '', confirm: '' },
    });

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        api
            .get<InvitationDetails>(`/api/v1/auth/invitation/${token}`)
            .then((res) => setDetails(res.data))
            .catch(() => setDetails(null))
            .finally(() => setLoading(false));
    }, [token]);

    const onSubmit = form.handleSubmit(async (data) => {
        setApiError(null);
        try {
            await api.post('/api/v1/auth/accept-invitation', { token, password: data.password });
            setDone(true);
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response: { data: { message?: string } } }).response?.data?.message
                    : null;
            setApiError(message || t('invalidInvitation'));
        }
    });

    if (loading) {
        return <p className="text-center text-sm text-text-secondary">{tCommon('loading')}</p>;
    }

    if (!token || !details) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {t('invalidInvitation')}
                </div>
                <Link href="/login" className="block text-center text-sm text-accent hover:underline">
                    {t('backToLogin')}
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="space-y-4 text-center">
                <div className="rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
                    {t('accountCreated')}
                </div>
                <p className="text-sm text-text-secondary">{t('checkYourInbox', { email: details.email })}</p>
                <Button className="w-full" size="lg" onClick={() => router.push('/login')}>
                    {t('goToLogin')}
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {apiError && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{apiError}</div>
            )}

            <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-card p-3">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('email')}</span>
                    <span className="font-mono text-sm text-text-primary">{details.email}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">{t('company')}</span>
                    <span className="text-sm text-text-primary">{details.companyName}</span>
                </div>
            </div>

            <FormField
                control={form.control}
                name="password"
                label={t('password')}
                type="password"
                placeholder={t('passwordPlaceholder')}
            />
            <FormField
                control={form.control}
                name="confirm"
                label={t('confirmPassword')}
                type="password"
                placeholder={t('passwordPlaceholder')}
            />

            <Button type="submit" className="w-full" size="lg" isLoading={form.formState.isSubmitting}>
                {t('createAccount')}
            </Button>
        </form>
    );
}

export default function AcceptInvitationPage() {
    const t = useTranslations('invitation');
    const tCommon = useTranslations('common');

    return (
        <Card className="space-y-6">
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-lg font-semibold text-text-primary">{t('title')}</h1>
                <p className="text-center text-sm text-text-secondary">{t('subtitle')}</p>
            </div>
            <Suspense fallback={<p className="text-center text-sm text-text-secondary">{tCommon('loading')}</p>}>
                <AcceptInvitationForm />
            </Suspense>
        </Card>
    );
}