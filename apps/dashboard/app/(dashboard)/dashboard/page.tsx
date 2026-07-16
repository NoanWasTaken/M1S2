'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HelpButton } from '@/components/ui/help-button';
import { WidgetBuilderModal } from '@/components/dashboard/widget-builder-modal';
import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { AreaChart } from '@/components/dashboard/area-chart';
import { LiveList } from '@/components/dashboard/live-list';
import { DataTable } from '@/components/dashboard/data-table';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { ProgressList } from '@/components/dashboard/progress-list';
import { Header } from '@/components/dashboard/header';
import { WidgetGrid, type WidgetDef } from '@/components/dashboard/widget-grid';
import { WidgetRenderer, renderWidgetBody } from '@/components/dashboard/widget';
import { fetchDashboardData, mockDashboardData, type DashboardData } from '@/lib/dashboard-api';
import { api } from '@/lib/api-client';
import { useDashboardStream as useDashboardSocket } from '@/lib/dashboard-stream';
import { useApplications } from '@/providers/application-provider';
import { AudiencePeakBanner } from '@/components/dashboard/audience-peak-banner';
import { GlobeWidget } from '@/components/dashboard/globe-widget';
import { Card } from '@/components/ui/card';

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

// live-list: mock LOT8
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
  appId,
}: {
  widgets: WidgetDef[];
  dataSources: Record<string, unknown>;
  appId: string;
}) {
  const rows = useMemo(() => {
    const sorted = [...widgets].sort(
      (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
    );
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
                <StaticWidget widget={w} dataSources={dataSources} appId={appId} />
              </div>
            </div>
          );
        }

        return (
          <div key={row.y} className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
            {row.left.map((w) => (
              <div key={w.widgetId} className={colSpanClass(span(w.position.w))}>
                <StaticWidget widget={w} dataSources={dataSources} appId={appId} />
              </div>
            ))}
            {row.right.length > 0 && (
              <div className="flex flex-col gap-4 lg:col-span-1">
                {row.right.map((w) => (
                  <StaticWidget
                    key={w.widgetId}
                    widget={w}
                    dataSources={dataSources}
                    appId={appId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function isCustomWidget(w: WidgetDef): boolean {
  return !!w.config?.metric;
}

function StaticWidget({
  widget,
  dataSources,
  appId,
}: {
  widget: WidgetDef;
  dataSources: Record<string, unknown>;
  appId: string;
}) {
  const t = useTranslations('dashboard');
  if (isCustomWidget(widget)) {
    return (
      <Card className="flex h-full flex-col">
        {renderWidgetBody(widget, null, t, appId, dataSources)}
      </Card>
    );
  }

  const data = (dataSources[widget.type] as DashboardData[keyof DashboardData]) ?? null;

  switch (widget.type) {
    case 'kpi':
      return (
        <KpiGrid>
          {((data ?? []) as DashboardData['kpi']).map((kpi) => (
            <KpiCard
              key={kpi.id}
              id={kpi.id}
              value={kpi.value}
              delta={kpi.delta}
              ratio={kpi.ratio}
            />
          ))}
        </KpiGrid>
      );
    case 'area-chart':
      return <AreaChart data={(data ?? []) as DashboardData['traffic']} />;
    case 'live-list':
      return <LiveList data={(data ?? []) as DashboardData['activePages']} />;
    case 'data-table':
      return <DataTable data={(data ?? []) as DashboardData['topPages']} />;
    case 'donut-chart':
      return <DonutChart data={(data ?? []) as DashboardData['sources']} />;
    case 'progress-list':
      return <ProgressList data={data as DashboardData['devices']} />;
    case 'globe':
      return <GlobeWidget />;
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
  {
    widgetId: 'area-chart',
    type: 'area-chart',
    title: "Trafic aujourd'hui",
    position: { x: 0, y: 2, w: 8, h: 3 },
  },
  {
    widgetId: 'live-list',
    type: 'live-list',
    title: 'Pages actives',
    position: { x: 8, y: 2, w: 4, h: 3 },
  },
  {
    widgetId: 'globe',
    type: 'globe',
    title: 'Visiteurs dans le monde',
    position: { x: 0, y: 1, w: 12, h: 3 },
  },
  {
    widgetId: 'data-table',
    type: 'data-table',
    title: 'Top pages',
    position: { x: 0, y: 5, w: 8, h: 3 },
  },
  {
    widgetId: 'donut-chart',
    type: 'donut-chart',
    title: 'Sources de trafic',
    position: { x: 8, y: 5, w: 4, h: 2 },
  },
  {
    widgetId: 'progress-list',
    type: 'progress-list',
    title: 'Appareils',
    position: { x: 8, y: 7, w: 4, h: 1 },
  },
];

export default function OverviewPage() {
  const { selectedAppId } = useApplications();
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [canEditLayout, setCanEditLayout] = useState(false);
  const [period, setPeriod] = useState('24h');
  const [data, setData] = useState<DashboardData>(mockDashboardData);

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

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      setCanEditLayout(mq.matches);
      if (!mq.matches) setIsEditing(false);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    fetchDashboardData(period, selectedAppId ?? undefined)
      .then(setData)
      .catch(() => setData(mockDashboardData));
  }, [period, selectedAppId]);

  const dataSources = useMemo(() => buildDataSources(data), [data]);

  const { activeVisitors, peakAlert } = useDashboardSocket({
    onUpdate: () => {
      fetchDashboardData(period, selectedAppId ?? undefined)
        .then(setData)
        .catch(() => {});
    },
  });

  const saveWidgets = useCallback((updated: WidgetDef[]) => {
    api.put('/api/v1/dashboard/widgets', { widgets: updated }).catch((err) => {
      const detail = err.response?.data ?? err.message;
      console.error('save widgets failed:', JSON.stringify(detail));
    });
  }, []);

  const handleLayoutChange = useCallback(
    (updated: WidgetDef[]) => {
      setWidgets(updated);
      saveWidgets(updated);
    },
    [saveWidgets],
  );

  const handleAddWidget = useCallback(
    (form: {
      type: string;
      title: string;
      metric: string;
      mode: string;
      step: string;
      pageUrl: string;
      filters: { field: string; value: string }[];
    }) => {
      const maxY = widgets.reduce((max, w) => Math.max(max, w.position.y + w.position.h), 0);
      const newWidget: WidgetDef = {
        widgetId: crypto.randomUUID(),
        type: form.type === 'timeseries' ? 'area-chart' : form.type,
        title: form.title || form.type,
        position: { x: 0, y: maxY, w: 6, h: 4 },
        config: {
          metric: form.metric,
          mode: form.mode,
          step: form.step,
          pageUrl: form.pageUrl || undefined,
          filters: form.filters.filter((f) => f.field),
        },
      };
      const updated = [...widgets, newWidget];
      setWidgets(updated);
      saveWidgets(updated);
      setBuilderOpen(false);
    },
    [widgets, saveWidgets],
  );

  const handleDeleteWidget = useCallback(
    (widgetId: string) => {
      const updated = widgets.filter((w) => w.widgetId !== widgetId);
      setWidgets(updated);
      saveWidgets(updated);
    },
    [widgets, saveWidgets],
  );

  return (
    <>
      <Header
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((v) => !v)}
        period={period}
        onPeriodChange={setPeriod}
        activeVisitors={activeVisitors ?? 0}
      />

      {isEditing && canEditLayout ? (
        <div className="p-6">
          <WidgetGrid
            widgets={widgets}
            onLayoutChange={handleLayoutChange}
            renderWidget={(w) => <WidgetRenderer widget={w} appId={selectedAppId ?? ''} />}
            onAddWidget={() => setBuilderOpen(true)}
            onDeleteWidget={handleDeleteWidget}
          />
        </div>
      ) : (
        <StaticDashboard widgets={widgets} dataSources={dataSources} appId={selectedAppId ?? ''} />
      )}

      <HelpButton />
      <AudiencePeakBanner alert={peakAlert} />

      <WidgetBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleAddWidget}
        pageUrls={data.topPages.map((page) => page.path)}
      />
    </>
  );
}
