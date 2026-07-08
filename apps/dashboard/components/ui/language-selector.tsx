'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';

const locales = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
];

export function LanguageSelector() {
  const currentLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: string) {
    startTransition(() => {
      document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-subtle p-0.5">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchLocale(code)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            currentLocale === code
              ? 'bg-accent text-[#05070d]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
