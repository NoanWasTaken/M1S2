'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';

type DeviceItem = {
  label: string;
  percentage: number;
  icon: string;
};

type ProgressListProps = {
  data: DeviceItem[];
  title?: string;
};

const iconMap: Record<string, React.ReactNode> = {
  desktop: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  mobile: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  tablet: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

export function ProgressList({ data, title }: ProgressListProps) {
  const t = useTranslations('dashboard');
  const displayTitle = title ?? t('devices');
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">{displayTitle}</h3>

      <div className="flex flex-col gap-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {iconMap[item.icon]}
                <span className="text-sm text-text-primary">{item.label}</span>
              </div>
              <span className="text-sm font-mono text-text-secondary">
                {item.percentage}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
