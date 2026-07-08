'use client';

import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/ui/language-selector';

type HeaderProps = {
  activeVisitors?: number;
};

const periodKeyMap: Record<string, 'period24h' | 'period7d' | 'period30d' | 'period90d'> = {
  '24h': 'period24h',
  '7d': 'period7d',
  '30d': 'period30d',
  '90d': 'period90d',
};

export function Header({ activeVisitors = 327 }: HeaderProps) {
  const tNav = useTranslations('nav');
  const tD = useTranslations('dashboard');

  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-[var(--bg-page)] px-6 py-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">{tNav('overview')}</h1>
        <span className="text-xl text-text-tertiary">/</span>
        <span className="text-sm text-text-secondary">{tD('today')}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card/50 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="font-mono text-sm font-bold text-accent">
            {activeVisitors}
          </span>
          <span className="text-xs text-text-secondary">{tD('activeVisitors')}</span>
        </div>

        <div className="flex items-center rounded-lg border border-border-subtle p-0.5">
          {['24h', '7d', '30d', '90d'].map((period) => (
            <button
              key={period}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === '24h'
                  ? 'bg-accent text-[#05070d]'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tD(periodKeyMap[period])}
            </button>
          ))}
        </div>

        <LanguageSelector />
      </div>
    </header>
  );
}
