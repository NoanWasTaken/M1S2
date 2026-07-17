'use client';

import { useTranslations } from 'next-intl';
import type { WidgetDef } from './widget-grid';
import { KpiCard } from './kpi-card';
import { AreaChart } from './area-chart';
import { LiveList } from './live-list';
import { DataTable } from './data-table';
import { DonutChart } from './donut-chart';
import { ProgressList } from './progress-list';
import { GlobeWidget } from './globe-widget';
import { HeatmapWidget } from './heatmap-widget';
import { CustomTimeseriesWidget } from './custom-timeseries';
import { kpiData, trafficData, activePagesData, topPagesData, trafficSourcesData, devicesData } from '@/lib/mock-data';

type WidgetRendererProps = {
  widget: WidgetDef;
  appId: string;
  dataSources?: Record<string, unknown>;
};

const WIDGET_TITLE_KEYS: Record<string, string> = {
  kpi: 'widgetKpi',
  heatmap: 'widgetHeatmap',
  'area-chart': 'trafficToday',
  'live-list': 'activePages',
  'data-table': 'topPages',
  'donut-chart': 'trafficSources',
  'progress-list': 'devices',
};

const dataMap: Record<string, unknown[]> = {
  kpi: kpiData,
  heatmap: [],
  'area-chart': trafficData,
  'live-list': activePagesData,
  'data-table': topPagesData,
  'donut-chart': trafficSourcesData,
  'progress-list': devicesData,
};

function isCustomWidget(widget: WidgetDef): boolean {
  return !!widget.config?.metric;
}

function SingleKpi({ metric, value }: { metric: string; value?: string }) {
  const tm = useTranslations('metrics');
  const label = tm(metric);
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="text-3xl font-bold font-mono text-text-primary">{value ?? '—'}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-text-secondary">{label}</div>
      </div>
    </div>
  );
}

function findKpiValue(dataSources: Record<string, unknown> | undefined, metric: string): string | undefined {
  if (!dataSources?.kpi) return undefined;
  const kpiList = dataSources.kpi as { id: string; value: string }[];
  const METRIC_TO_KPI_ID: Record<string, string> = {
    pageview: 'pageViews',
    click: 'clicks',
    hover: 'hovers',
    page_exit: 'pageExits',
    tabchange: 'tabChanges',
    sessions: 'sessions',
    pageViews: 'pageViews',
    bounceRate: 'bounceRate',
    avgDuration: 'avgDuration',
  };
  const kpiId = METRIC_TO_KPI_ID[metric];
  if (!kpiId) return undefined;
  const found = kpiList.find((k) => k.id === kpiId);
  return found?.value;
}

export function WidgetRenderer({ widget, appId, dataSources }: WidgetRendererProps) {
  const t = useTranslations('dashboard');
  const data = dataMap[widget.type];
  const titleKey = WIDGET_TITLE_KEYS[widget.type];
  const title = titleKey && !isCustomWidget(widget) ? t(titleKey) : (widget.title || t(titleKey || 'widgetKpi'));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border-card bg-bg-card">
      <div className="widget-drag-handle flex cursor-grab items-center justify-between border-b border-border-subtle bg-bg-sidebar/50 px-4 py-2">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {renderWidgetBody(widget, data, t, appId, dataSources)}
      </div>
    </div>
  );
}

export function renderWidgetBody(
  widget: WidgetDef,
  data: unknown,
  t: ReturnType<typeof useTranslations<'dashboard'>>,
  appId: string,
  dataSources?: Record<string, unknown>,
) {
  const { type, config } = widget;

  function getHeatmapConfig(c: Record<string, unknown> | undefined): { pageUrl?: string; period?: string } | undefined {
    if (!c) return undefined;
    return {
      pageUrl: typeof c.pageUrl === 'string' ? c.pageUrl : undefined,
      period: typeof c.period === 'string' ? c.period : undefined,
    };
  }

  if (isCustomWidget(widget)) {
    switch (type) {
      case 'kpi': {
        const metric = String(config?.metric ?? '');
        const value = findKpiValue(dataSources, metric);
        return <SingleKpi metric={metric} value={value} />;
      }
      case 'area-chart':
        return <CustomTimeseriesWidget appId={appId} metric={String(config?.metric ?? '')} title={widget.title} />;
      case 'heatmap':
        return <HeatmapWidget widgetId={widget.widgetId} appId={appId} config={getHeatmapConfig(config)} />;
      default:
        return <p className="text-sm text-text-secondary">{t('unknownWidgetType', { type })}</p>;
    }
  }

  switch (type) {
    case 'kpi':
      return (
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data as typeof kpiData).map((item) => (
            <KpiCard key={item.id} id={item.id} value={item.value} delta={item.delta} ratio={item.ratio} />
          ))}
        </div>
      );
    case 'area-chart':
      return <AreaChart data={data as typeof trafficData} />;
    case 'live-list':
      return <LiveList data={data as typeof activePagesData} />;
    case 'data-table':
      return <DataTable data={data as typeof topPagesData} />;
    case 'donut-chart':
      return <DonutChart data={data as typeof trafficSourcesData} />;
    case 'progress-list':
      return <ProgressList data={data as typeof devicesData} />;
    case 'globe':
      return <GlobeWidget />;
    case 'heatmap':
      return <HeatmapWidget widgetId={widget.widgetId} appId={appId} config={getHeatmapConfig(config)} />;
    default:
      return <p className="text-sm text-text-secondary">{t('unknownWidgetType', { type })}</p>;
  }
}
