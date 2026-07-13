'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { DeltaBadge } from '@/components/ui/delta-badge';

type TopPageRow = {
  rank: number;
  name: string;
  path: string;
  views: number;
  evol?: number;
  avgDuration: string;
};

type DataTableProps = {
  data: TopPageRow[];
};

function formatViews(views: number): string {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}

export function DataTable({ data }: DataTableProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">{t('topPages')}</h3>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            <th className="pb-2 text-left font-medium">{t('page')}</th>
            <th className="pb-2 text-right font-medium">{t('views')}</th>
            <th className="pb-2 text-right font-medium">{t('evolution')}</th>
            <th className="pb-2 text-right font-medium">{t('avgTime')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.rank} className="border-t border-border-subtle">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">{row.rank}</span>
                  <div>
                    <p className="font-medium text-text-primary">{row.name}</p>
                    <p className="font-mono text-xs text-text-secondary">{row.path}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-right font-mono text-text-primary">
                {formatViews(row.views)}
              </td>
              <td className="py-3 text-right">
                {typeof row.evol === 'number' ? (
                  <DeltaBadge value={row.evol} />
                ) : (
                  <span className="text-text-tertiary">{tCommon('notAvailable')}</span>
                )}
              </td>
              <td className="py-3 text-right font-mono text-sm text-text-secondary">
                {row.avgDuration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}