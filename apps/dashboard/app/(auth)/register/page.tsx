'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@m1s2/shared';
import { useAuth } from '@/providers/auth-provider';
import { GuestOnly } from '@/components/auth/guest-only';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
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
          : 'Une erreur est survenue';
      setApiError(message || 'Erreur lors de l\'inscription');
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
            Créer un compte
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
              Société
            </h2>

            <FormField
              control={form.control}
              name="company.name"
              label="Nom de la société"
              placeholder="Ma Société"
            />

            <FormField
              control={form.control}
              name="company.baseUrl"
              label="URL du site"
              type="url"
              placeholder="https://monsite.fr"
            />

            <FormField
              control={form.control}
              name="company.kbisFileRef"
              label="Référence KBIS"
              placeholder="Numéro ou référence du document"
            />

            <FormField
              control={form.control}
              name="company.contact.name"
              label="Nom du contact"
              placeholder="Jean Dupont"
            />

            <FormField
              control={form.control}
              name="company.contact.email"
              label="Email du contact"
              type="email"
              placeholder="contact@example.fr"
            />

            <FormField
              control={form.control}
              name="company.contact.phone"
              label="Téléphone (optionnel)"
              type="tel"
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Compte utilisateur
            </h2>

            <FormField
              control={form.control}
              name="user.email"
              label="Email"
              type="email"
              placeholder="vous@exemple.fr"
            />

            <FormField
              control={form.control}
              name="user.password"
              label="Mot de passe"
              type="password"
              placeholder="8 caractères minimum"
            />

            <FormField
              control={form.control}
              name="user.confirmPassword"
              label="Confirmer le mot de passe"
              type="password"
              placeholder="Répétez le mot de passe"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={form.formState.isSubmitting}
          >
            Créer mon compte
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="font-medium text-accent hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </Card>
    </GuestOnly>
  );
}
