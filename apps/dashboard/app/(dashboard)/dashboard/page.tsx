'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HelpButton } from '@/components/ui/help-button';
import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { AreaChart } from '@/components/dashboard/area-chart';
import { LiveList } from '@/components/dashboard/live-list';
import { DataTable } from '@/components/dashboard/data-table';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { ProgressList } from '@/components/dashboard/progress-list';
import { Header } from '@/components/dashboard/header';
import { WidgetGrid, type WidgetDef } from '@/components/dashboard/widget-grid';
import { WidgetRenderer } from '@/components/dashboard/widget';
import { fetchDashboardData, mockDashboardData, type DashboardData } from '@/lib/dashboard-api';
import { api } from '@/lib/api-client';
import { useDashboardStream as useDashboardSocket } from '@/lib/dashboard-stream';
import { useApplications } from '@/providers/application-provider';

const COLUMNS = 12;

function span(w: number) {
  if (w >= COLUMNS) return 'full';
  const ratio = w / COLUMNS;
  if (ratio <= 1 / 3) return 'third';
  if (ratio <= 2 / 3) return 'two-thirds';
  return 'full';
}

function colSpanClass(s: 'full' | 'two-thirds' | 'third') {
  if (s === 'full') return 'lg:col-span-3';
  if (s === 'two-thirds') return 'lg:col-span-2';
  return 'lg:col-span-1';
}

// Build the per-type data map from the real dashboard data.
// live-list ("Pages actives") stays on mock until the realtime lot (LOT 8).
function buildDataSources(data: DashboardData): Record<string, unknown> {
  return {
    kpi: data.kpi,
    'area-chart': data.traffic,
    'live-list': data.activePages,
    'data-table': data.topPages,
    'donut-chart': data.sources,
    'progress-list': data.devices,
  };
}

function StaticDashboard({
  widgets,
  dataSources,
}: {
  widgets: WidgetDef[];
  dataSources: Record<string, unknown>;
}) {
  const rows = useMemo(() => {
    const sorted = [...widgets].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    const merged: { y: number; left: WidgetDef[]; right: WidgetDef[] }[] = [];

    for (const w of sorted) {
      if (w.position.w >= COLUMNS) {
        merged.push({ y: w.position.y, left: [w], right: [] });
        continue;
      }

      if (w.position.x < COLUMNS / 2) {
        merged.push({ y: w.position.y, left: [w], right: [] });
      } else {
        const prev = merged[merged.length - 1];
        if (prev && prev.left.length > 0) {
          prev.right.push(w);
        } else {
          merged.push({ y: w.position.y, left: [], right: [w] });
        }
      }
    }

    return merged;
  }, [widgets]);

  return (
    <div className="flex flex-col gap-4 p-6">
      {rows.map((row) => {
        if (row.left.length === 1 && row.right.length === 0) {
          const w = row.left[0];
          return (
            <div key={w.widgetId} className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
              <div className={colSpanClass(span(w.position.w))}>
                <StaticWidget widget={w} dataSources={dataSources} />
              </div>
            </div>
          );
        }

        return (
          <div key={row.y} className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
            {row.left.map((w) => (
              <div key={w.widgetId} className={colSpanClass(span(w.position.w))}>
                <StaticWidget widget={w} dataSources={dataSources} />
              </div>
            ))}
            {row.right.length > 0 && (
              <div className="flex flex-col gap-4 lg:col-span-1">
                {row.right.map((w) => (
                  <StaticWidget key={w.widgetId} widget={w} dataSources={dataSources} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StaticWidget({
  widget,
  dataSources,
}: {
  widget: WidgetDef;
  dataSources: Record<string, unknown>;
}) {
  const data = dataSources[widget.type];

  switch (widget.type) {
    case 'kpi':
      return (
        <KpiGrid>
          {(data as DashboardData['kpi']).map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </KpiGrid>
      );
    case 'area-chart':
      return <AreaChart data={data as DashboardData['traffic']} />;
    case 'live-list':
      return <LiveList data={data as DashboardData['activePages']} />;
    case 'data-table':
      return <DataTable data={data as DashboardData['topPages']} />;
    case 'donut-chart':
      return <DonutChart data={data as DashboardData['sources']} />;
    case 'progress-list':
      return <ProgressList data={data as DashboardData['devices']} />;
    default:
      return null;
  }
}

function fillMissingDefaults(widgets: WidgetDef[]): WidgetDef[] {
  const existing = new Set(widgets.map((w) => w.widgetId));
  const missing = defaultWidgets.filter((w) => !existing.has(w.widgetId));
  return missing.length > 0 ? [...widgets, ...missing] : widgets;
}

const defaultWidgets: WidgetDef[] = [
  { widgetId: 'kpi', type: 'kpi', title: 'KPI', position: { x: 0, y: 0, w: 12, h: 2 } },
  { widgetId: 'area-chart', type: 'area-chart', title: 'Trafic aujourd\'hui', position: { x: 0, y: 2, w: 8, h: 3 } },
  { widgetId: 'live-list', type: 'live-list', title: 'Pages actives', position: { x: 8, y: 2, w: 4, h: 3 } },
  { widgetId: 'data-table', type: 'data-table', title: 'Top pages', position: { x: 0, y: 5, w: 8, h: 3 } },
  { widgetId: 'donut-chart', type: 'donut-chart', title: 'Sources de trafic', position: { x: 8, y: 5, w: 4, h: 2 } },
  { widgetId: 'progress-list', type: 'progress-list', title: 'Appareils', position: { x: 8, y: 7, w: 4, h: 1 } },
];

export default function OverviewPage() {
  const { selectedAppId } = useApplications();
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [period, setPeriod] = useState('24h');
  const [data, setData] = useState<DashboardData>(mockDashboardData);

  // Load widget layout
  useEffect(() => {
    api
      .get('/api/v1/dashboard/widgets')
      .then((res) => {
        const remote = res.data.widgets as WidgetDef[];
        setWidgets(remote.length > 0 ? fillMissingDefaults(remote) : defaultWidgets);
      })
      .catch(() => {
        setWidgets(defaultWidgets);
      });
  }, []);

  // Load real dashboard data whenever the period changes
  useEffect(() => {
    fetchDashboardData(period, selectedAppId ?? undefined)
      .then(setData)
      .catch(() => setData(mockDashboardData));
  }, [period, selectedAppId]);

  const dataSources = useMemo(() => buildDataSources(data), [data]);

  const { activeVisitors } = useDashboardSocket({
    onUpdate: () => {
      fetchDashboardData(period, selectedAppId ?? undefined).then(setData).catch(() => { });
    },
  });

  const handleLayoutChange = useCallback((updated: WidgetDef[]) => {
    setWidgets(updated);
    api.put('/api/v1/dashboard/widgets', { widgets: updated }).catch(() => { });
  }, []);

  return (
    <>
      <Header
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((v) => !v)}
        period={period}
        onPeriodChange={setPeriod}
        activeVisitors={activeVisitors ?? 0}
      />

      {isEditing ? (
        <div className="p-6">
          <WidgetGrid
            widgets={widgets}
            onLayoutChange={handleLayoutChange}
            renderWidget={(w) => <WidgetRenderer widget={w} />}
          />
        </div>
      ) : (
        <StaticDashboard widgets={widgets} dataSources={dataSources} />
      )}

      <HelpButton />
    </>
  );
}