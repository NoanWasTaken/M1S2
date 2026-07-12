'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import type { SourceItem } from '@/lib/dashboard-api';

type DonutChartProps = {
  data: SourceItem[];
};

const SOURCE_LABEL_KEYS: Record<string, 'organic' | 'direct' | 'social' | 'referrals' | 'email'> = {
  organic: 'organic',
  direct: 'direct',
  social: 'social',
  referral: 'referrals',
  email: 'email',
};

export function DonutChart({ data }: DonutChartProps) {
  const t = useTranslations('dashboard');

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">{t('trafficSources')}</h3>

      <div className="flex items-center gap-4">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={56}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2">
          {data.map((item) => {
            const labelKey = SOURCE_LABEL_KEYS[item.key];
            return (
              <div key={item.key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-text-primary">
                  {labelKey ? t(labelKey) : item.key}
                </span>
                <span className="ml-auto text-sm font-mono text-text-secondary">
                  {item.value}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
