'use client';

import { useTranslations } from 'next-intl';
import type { WidgetDef } from './widget-grid';
import { KpiCard } from './kpi-card';
import { AreaChart } from './area-chart';
import { LiveList } from './live-list';
import { DataTable } from './data-table';
import { DonutChart } from './donut-chart';
import { ProgressList } from './progress-list';
import { kpiData, trafficData, activePagesData, topPagesData, trafficSourcesData, devicesData } from '@/lib/mock-data';

type WidgetRendererProps = {
  widget: WidgetDef;
};

const WIDGET_TITLE_KEYS: Record<string, 'widgetKpi' | 'trafficToday' | 'activePages' | 'topPages' | 'trafficSources' | 'devices'> = {
  kpi: 'widgetKpi',
  'area-chart': 'trafficToday',
  'live-list': 'activePages',
  'data-table': 'topPages',
  'donut-chart': 'trafficSources',
  'progress-list': 'devices',
};

const dataMap: Record<string, unknown[]> = {
  kpi: kpiData,
  'area-chart': trafficData,
  'live-list': activePagesData,
  'data-table': topPagesData,
  'donut-chart': trafficSourcesData,
  'progress-list': devicesData,
};

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const t = useTranslations('dashboard');
  const data = dataMap[widget.type];
  const titleKey = WIDGET_TITLE_KEYS[widget.type];
  const title = titleKey ? t(titleKey) : widget.title;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border-card bg-bg-card">
      <div className="widget-drag-handle flex cursor-grab items-center justify-between border-b border-border-subtle bg-bg-sidebar/50 px-4 py-2">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="text-text-tertiary">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
          </svg>
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {renderWidgetBody(widget.type, data, t)}
      </div>
    </div>
  );
}

function renderWidgetBody(type: string, data: unknown, t: ReturnType<typeof useTranslations<'dashboard'>>) {
  switch (type) {
    case 'kpi': {
      const items = data as typeof kpiData;
      return (
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <KpiCard key={item.id} id={item.id} value={item.value} delta={item.delta} ratio={item.ratio} />
          ))}
        </div>
      );
    }
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
    default:
      return <p className="text-sm text-text-secondary">{t('unknownWidgetType', { type })}</p>;
  }
}
