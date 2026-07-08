'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

type SourceItem = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: SourceItem[];
};

export function DonutChart({ data }: DonutChartProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Sources de trafic</h3>

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
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-text-primary">{item.label}</span>
              <span className="ml-auto text-sm font-mono text-text-secondary">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
