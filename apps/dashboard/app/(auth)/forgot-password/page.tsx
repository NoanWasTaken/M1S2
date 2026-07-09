'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';

type FormValues = { email: string };

export default function ForgotPasswordPage() {
    const t = useTranslations('common');
    const locale = useLocale();
    const schema = useMemo(
        () => z.object({ email: z.string().email(t('invalidEmail')) }),
        [t],
    );
    const [sent, setSent] = useState(false);
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    });

    const onSubmit = form.handleSubmit(async (data) => {
        await api
            .post('/api/v1/auth/forgot-password', { email: data.email, locale })
            .catch(() => undefined);
        setSent(true);
    });

    return (
        <Card className="space-y-6">
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-lg font-semibold text-text-primary">{t('forgotPassword')}</h1>
                <p className="text-center text-sm text-text-secondary">
                    {t('enterEmail')}
                </p>
            </div>

            {sent ? (
                <div className="space-y-4">
                    <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                        {t('emailSent')}
                    </div>
                    <Link href="/login" className="block text-center text-sm text-accent hover:underline">
                        {t('backToLogin')}
                    </Link>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        label="Email"
                        type="email"
                        placeholder="vous@exemple.fr"
                    />
                    <Button type="submit" className="w-full" size="lg" isLoading={form.formState.isSubmitting}>
                        {t('sendLink')}
                    </Button>
                    <Link
                        href="/login"
                        className="block text-center text-sm text-text-secondary hover:text-text-primary"
                    >
                        {t('backToLogin')}
                    </Link>
                </form>
            )}
        </Card>
    );
}