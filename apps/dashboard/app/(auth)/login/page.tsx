'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useTranslations } from 'next-intl';
import { loginSchema, type LoginInput } from '@m1s2/shared';
import { useAuth } from '@/providers/auth-provider';
import { GuestOnly } from '@/components/auth/guest-only';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('auth.login');
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message?: string } } }).response?.data
            ?.message
          : t('error');
      setApiError(message || t('error'));
    }
  });

  return (
    <GuestOnly>
      <Card className="space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <svg
              className="h-5 w-5 text-[#05070d]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            {t('title')}
          </h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {apiError && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {apiError}
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            label={t('email')}
            type="email"
            placeholder={t('emailPlaceholder')}
          />

          <FormField
            control={form.control}
            name="password"
            label={t('password')}
            type="password"
            placeholder={t('passwordPlaceholder')}
          />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-accent hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={form.formState.isSubmitting}
          >
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          {t('noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-accent hover:underline"
          >
            {t('createAccount')}
          </Link>
        </p>
      </Card>
    </GuestOnly>
  );
}
