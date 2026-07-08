import { Card } from '@/components/ui/card';
import { DeltaBadge } from '@/components/ui/delta-badge';

type KpiCardProps = {
  label: string;
  value: string;
  delta: number;
  subtext: string;
};

export function KpiCard({ label, value, delta, subtext }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold text-text-primary">
          {value}
        </span>
        <DeltaBadge value={delta} />
      </div>

      <p className="text-xs text-text-secondary">{subtext}</p>
    </Card>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}
