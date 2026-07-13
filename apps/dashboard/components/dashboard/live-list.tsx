'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';

type ActivePage = {
  path: string;
  visitors: number;
};

type LiveListProps = {
  data: ActivePage[];
};

export function LiveList({ data }: LiveListProps) {
  const t = useTranslations('dashboard');
  if (data.length === 0) {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-text-tertiary" />
          </span>
          <h3 className="text-sm font-semibold text-text-primary">{t('activePages')}</h3>
        </div>
        <p className="text-sm text-text-secondary">{t('noActivePages')}</p>
      </Card>
    );
  }
  const maxVisitors = Math.max(...data.map((d) => d.visitors));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <h3 className="text-sm font-semibold text-text-primary">{t('activePages')}</h3>
      </div>

      <div className="flex flex-col gap-3">
        {data.map((page) => (
          <div key={page.path}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-sm text-text-primary">{page.path}</span>
              <span className="font-mono text-sm text-text-primary">{page.visitors}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(page.visitors / maxVisitors) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
