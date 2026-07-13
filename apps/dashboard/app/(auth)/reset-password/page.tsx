'use client';

import { Suspense, useMemo, useState } from 'react';
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.resetPassword');
  const tCommon = useTranslations('common');
  const token = searchParams.get('token') ?? '';
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

  const onSubmit = form.handleSubmit(async (data) => {
    setApiError(null);
    try {
      await api.post('/api/v1/auth/reset-password', { token, password: data.password });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message?: string } } }).response?.data?.message
          : null;
      setApiError(message || t('invalidToken'));
    }
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t('invalidToken')}
        </div>
        <Link href="/forgot-password" className="block text-center text-sm text-accent hover:underline">
          {t('requestNewLink')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
        {t('passwordReset')}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {apiError && (
        <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{apiError}</div>
      )}
      <FormField
        control={form.control}
        name="password"
        label={t('newPassword')}
        type="password"
        placeholder={tCommon('passwordPlaceholder')}
      />
      <FormField
        control={form.control}
        name="confirm"
        label={t('confirmPassword')}
        type="password"
        placeholder={tCommon('passwordPlaceholder')}
      />
      <Button type="submit" className="w-full" size="lg" isLoading={form.formState.isSubmitting}>
        {t('resetPassword')}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const tCommon = useTranslations('common');

  return (
    <Card className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-lg font-semibold text-text-primary">{t('resetPassword')}</h1>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-text-secondary">{tCommon('loading')}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  );
}
