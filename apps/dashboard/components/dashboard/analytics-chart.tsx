'use client';

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { useTranslations } from 'next-intl';

export type SeriesPoint = Record<string, string | number>;

export const SERIES_COLORS: Record<string, string> = {
    pageview: '#38bdf8',
    click: '#818cf8',
    hover: '#34d399',
    page_exit: '#fbbf24',
    tabchange: '#f472b6',
};

const FALLBACK_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c'];

export function colorOf(type: string, index: number): string {
    return SERIES_COLORS[type] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

type Props = {
    data: SeriesPoint[];
    series: string[];
};

export function AnalyticsChart({ data, series }: Props) {
    const t = useTranslations('analytics');

    return (
        <div className="h-48 w-full lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        {series.map((type, i) => (
                            <linearGradient key={type} id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorOf(type, i)} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colorOf(type, i)} stopOpacity={0} />
                            </linearGradient>
                        ))}
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
                        allowDecimals={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
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
                    <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        iconType="plainline"
                    />

                    {series.map((type, i) => (
                        <Area
                            key={type}
                            type="monotone"
                            dataKey={type}
                            name={t(`metrics.${type}`)}
                            stroke={colorOf(type, i)}
                            strokeWidth={2}
                            fill={`url(#grad-${type})`}
                            dot={false}
                            activeDot={{ r: 4, fill: colorOf(type, i) }}
                        />
                    ))}
                </RechartsAreaChart>
            </ResponsiveContainer>
        </div>
    );
}