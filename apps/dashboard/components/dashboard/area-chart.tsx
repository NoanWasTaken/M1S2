'use client';

import { useTranslations } from 'next-intl';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';

type TrafficPoint = {
  time: string;
  sessions: number;
  pageViews: number;
};

type AreaChartProps = {
  data: TrafficPoint[];
};

export function AreaChart({ data }: AreaChartProps) {
  const t = useTranslations('dashboard');
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('trafficToday')}
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[#38bdf8]" />
            <span className="text-xs text-text-secondary">{t('sessions')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[#818cf8]" />
            <span className="text-xs text-text-secondary">{t('pageViews')}</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}K` : String(v))}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1220',
                border: '1px solid #1c2333',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#e5e7eb',
              }}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#sessionsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8' }}
            />
            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="#818cf8"
              strokeWidth={2}
              fill="url(#pageViewsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#818cf8' }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
