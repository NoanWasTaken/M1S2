'use client';

import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/ui/language-selector';

type HeaderProps = {
  activeVisitors?: number;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  period?: string;
  onPeriodChange?: (period: string) => void;
};

const periodKeyMap: Record<string, 'period24h' | 'period7d' | 'period30d' | 'period90d'> = {
  '24h': 'period24h',
  '7d': 'period7d',
  '30d': 'period30d',
  '90d': 'period90d',
};

export function Header({
  activeVisitors = 0,
  isEditing,
  onToggleEdit,
  period = '24h',
  onPeriodChange,
}: HeaderProps) {
  const tNav = useTranslations('nav');
  const tD = useTranslations('dashboard');
  const tCommon = useTranslations('common');

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

        <button
          type="button"
          onClick={onToggleEdit}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${isEditing
              ? 'border-accent bg-accent text-[#05070d]'
              : 'border-border-subtle text-text-secondary hover:border-accent hover:text-accent'
            }`}
          aria-label={isEditing ? tCommon('done') : tCommon('edit')}
        >
          {isEditing ? (
            tCommon('done')
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </button>

        <div className="flex items-center rounded-lg border border-border-subtle p-0.5">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange?.(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === p
                  ? 'bg-accent text-[#05070d]'
                  : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              {tD(periodKeyMap[p])}
            </button>
          ))}
        </div>

        <LanguageSelector />
      </div>
    </header>
  );
}