'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { registerSchema, type RegisterInput } from '@m1s2/shared';
import { useAuth } from '@/providers/auth-provider';
import { GuestOnly } from '@/components/auth/guest-only';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

const MAX_KBIS_BYTES = 10 * 1024 * 1024;

type RegisterFormValues = RegisterInput & { acceptTerms: boolean };

function KbisFileField({
  control,
}: {
  control: ReturnType<typeof useForm<RegisterFormValues>>['control'];
}) {
  const t = useTranslations('auth.register');
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { field, fieldState } = useController({
    control,
    name: 'company.kbisFileRef',
  });

  const uploadFile = async (file: File) => {
    setLocalError(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError(t('kbisPdfOnly'));
      return;
    }
    if (file.size > MAX_KBIS_BYTES) {
      setLocalError(t('kbisTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('kbis', file);
      const res = await api.post<{ kbisFileRef: string }>('/api/v1/auth/kbis', body, {
        headers: { 'Content-Type': undefined },
      });
      field.onChange(res.data.kbisFileRef);
      setFileName(file.name);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message?: string } } }).response?.data?.message
          : null;
      setLocalError(message || t('kbisUploadError'));
      field.onChange('');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void uploadFile(file);
  };

  const error = localError || fieldState.error?.message;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary">{t('kbis')}</label>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? 'border-accent bg-accent/10'
            : error
              ? 'border-danger/50 bg-danger/5'
              : 'border-border-subtle bg-bg-card hover:border-accent/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        {uploading ? (
          <p className="text-sm text-text-secondary">{t('kbisUploading')}</p>
        ) : fileName && field.value ? (
          <>
            <p className="text-sm font-medium text-text-primary">{fileName}</p>
            <p className="text-xs text-success">{t('kbisReady')}</p>
            <p className="text-xs text-text-tertiary">{t('kbisReplace')}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-primary">{t('kbisDrop')}</p>
            <p className="text-xs text-text-tertiary">{t('kbisHint')}</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const t = useTranslations('auth.register');
  const [apiError, setApiError] = useState<string | null>(null);

  const formSchema = registerSchema.and(
    z.object({
      acceptTerms: z.boolean().refine((value) => value === true, {
        message: t('acceptTermsRequired'),
      }),
    }),
  );

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: { name: '', baseUrl: '', kbisFileRef: '', contact: { name: '', email: '', phone: '' } },
      user: { email: '', password: '', confirmPassword: '' },
      acceptTerms: false,
    },
  });

  const acceptTerms = form.watch('acceptTerms');
  const acceptTermsError = form.formState.errors.acceptTerms?.message;

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

            <KbisFileField control={form.control} />

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

          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-subtle bg-bg-card px-3 py-3">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  form.setValue('acceptTerms', e.target.checked, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-subtle accent-(--accent)"
              />
              <span className="text-sm leading-5 text-text-secondary">
                {t('acceptTermsPrefix')}{' '}
                <Link
                  href="/legal/cgu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('acceptTermsLink')}
                </Link>
              </span>
            </label>
            {acceptTermsError && (
              <p className="text-xs text-danger">{acceptTermsError}</p>
            )}
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
