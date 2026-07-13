'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useTranslations } from 'next-intl';
import { registerSchema, type RegisterInput } from '@m1s2/shared';
import { useAuth } from '@/providers/auth-provider';
import { GuestOnly } from '@/components/auth/guest-only';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const t = useTranslations('auth.register');
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company: { name: '', baseUrl: '', kbisFileRef: '', contact: { name: '', email: '', phone: '' } },
      user: { email: '', password: '', confirmPassword: '' },
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setApiError(null);
    try {
      const { user: { confirmPassword: _, ...user }, company } = data;
      await registerUser({ company, user });
      router.push('/pending-validation');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message?: string } } }).response?.data
              ?.message
          : t('submit');
      setApiError(message || t('submit'));
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

        <form onSubmit={onSubmit} className="space-y-6">
          {apiError && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {apiError}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              {t('companySection')}
            </h2>

            <FormField
              control={form.control}
              name="company.name"
              label={t('companyName')}
              placeholder={t('companyNamePlaceholder')}
            />

            <FormField
              control={form.control}
              name="company.baseUrl"
              label={t('siteUrl')}
              type="url"
              placeholder={t('siteUrlPlaceholder')}
            />

            <FormField
              control={form.control}
              name="company.kbisFileRef"
              label={t('kbis')}
              placeholder={t('kbisPlaceholder')}
            />

            <FormField
              control={form.control}
              name="company.contact.name"
              label={t('contactName')}
              placeholder={t('contactNamePlaceholder')}
            />

            <FormField
              control={form.control}
              name="company.contact.email"
              label={t('contactEmail')}
              type="email"
              placeholder={t('contactEmailPlaceholder')}
            />

            <FormField
              control={form.control}
              name="company.contact.phone"
              label={t('contactPhone')}
              type="tel"
              placeholder={t('contactPhonePlaceholder')}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              {t('accountSection')}
            </h2>

            <FormField
              control={form.control}
              name="user.email"
              label={t('userEmail')}
              type="email"
              placeholder={t('userEmailPlaceholder')}
            />

            <FormField
              control={form.control}
              name="user.password"
              label={t('password')}
              type="password"
              placeholder={t('passwordPlaceholder')}
            />

            <FormField
              control={form.control}
              name="user.confirmPassword"
              label={t('confirmPassword')}
              type="password"
              placeholder={t('confirmPasswordPlaceholder')}
            />
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
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-accent hover:underline"
          >
            {t('login')}
          </Link>
        </p>
      </Card>
    </GuestOnly>
  );
}
