'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api-client';

type CustomTimeseriesProps = {
  appId: string;
  metric: string;
  title?: string;
};

export function CustomTimeseriesWidget({ appId, metric, title }: CustomTimeseriesProps) {
  const tm = useTranslations('metrics');
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    api.get('/api/v1/analytics/timeseries', {
      params: { appId, types: metric },
    })
      .then((res) => {
        const points = (res.data as { points: Record<string, string | number>[] }).points;
        const mapped = points.map((p) => ({
          time: p.time as string,
          value: (p[metric] as number) ?? 0,
        }));
        setData(mapped);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [appId, metric]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">No data</p>
      </div>
    );
  }

  const label = title ?? tm(metric);

  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
      <div className="h-48 w-full lg:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="customGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
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
            dataKey="value"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#customGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#38bdf8' }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
