import { Card } from '@/components/ui/card';
import { DeltaBadge } from '@/components/ui/delta-badge';

type TopPageRow = {
  rank: number;
  name: string;
  path: string;
  views: number;
  evol: number;
  avgDuration: string;
};

type DataTableProps = {
  data: TopPageRow[];
};

export function DataTable({ data }: DataTableProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Top pages</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            <th className="pb-2 text-left font-medium">PAGE</th>
            <th className="pb-2 text-right font-medium">VUES</th>
            <th className="pb-2 text-right font-medium">ÉVOL.</th>
            <th className="pb-2 text-right font-medium">DURÉE MOY.</th>
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
                {(row.views / 1000).toFixed(1)}K
              </td>
              <td className="py-3 text-right">
                <DeltaBadge value={row.evol} />
              </td>
              <td className="py-3 text-right font-mono text-sm text-text-secondary">
                {row.avgDuration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
