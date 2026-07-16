'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import GridLayout, { type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Card } from '@/components/ui/card';

export type WidgetDef = {
  widgetId: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config?: Record<string, unknown>;
};

type WidgetGridProps = {
  widgets: WidgetDef[];
  onLayoutChange: (widgets: WidgetDef[]) => void;
  renderWidget: (widget: WidgetDef) => React.ReactNode;
  onAddWidget?: () => void;
  onDeleteWidget?: (widgetId: string) => void;
};

const COLUMNS = 12;
const ROW_HEIGHT = 100;

export function WidgetGrid({ widgets, onLayoutChange, renderWidget, onAddWidget, onDeleteWidget }: WidgetGridProps) {
  const t = useTranslations('dashboard');
  const layout = useMemo<Layout>(
    () =>
      widgets.map((w) => ({
        i: w.widgetId,
        x: w.position.x,
        y: w.position.y,
        w: w.position.w,
        h: w.position.h,
      })),
    [widgets],
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const updated = widgets.map((w) => {
        const item = newLayout.find((l) => l.i === w.widgetId);
        if (!item) return w;
        return {
          ...w,
          position: { x: item.x, y: item.y, w: item.w, h: item.h },
        };
      });
      onLayoutChange(updated);
    },
    [widgets, onLayoutChange],
  );

  if (widgets.length === 0) {
    return (
      <Card className="flex items-center justify-center p-12">
        <p className="text-sm text-text-secondary">{t('noWidgetsConfigured')}</p>
      </Card>
    );
  }

  return (
    <>
      {onAddWidget && (
        <button
          onClick={onAddWidget}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-subtle py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('widgetBuilderTitle')}
        </button>
      )}
      <GridLayout
      className="layout"
      layout={layout}
      width={1200}
      onLayoutChange={handleLayoutChange}
      gridConfig={{ cols: COLUMNS, rowHeight: ROW_HEIGHT }}
      dragConfig={{ handle: '.widget-drag-handle' }}
      resizeConfig={{ enabled: true, handles: ['se', 'e', 'w', 's'] }}
    >
      {widgets.map((widget) => (
        <div key={widget.widgetId} className="group relative overflow-hidden rounded-xl">
          {onDeleteWidget && (
            <button
              onClick={() => onDeleteWidget(widget.widgetId)}
              className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-danger/80 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
              aria-label="Delete widget"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {renderWidget(widget)}
        </div>
      ))}
    </GridLayout>
    </>
  );
}
