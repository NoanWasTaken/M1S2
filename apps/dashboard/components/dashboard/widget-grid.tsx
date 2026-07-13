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
};

type WidgetGridProps = {
  widgets: WidgetDef[];
  onLayoutChange: (widgets: WidgetDef[]) => void;
  renderWidget: (widget: WidgetDef) => React.ReactNode;
};

const COLUMNS = 12;
const ROW_HEIGHT = 100;

export function WidgetGrid({ widgets, onLayoutChange, renderWidget }: WidgetGridProps) {
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
    <GridLayout
      className="layout"
      layout={layout}
      width={1200}
      onLayoutChange={handleLayoutChange}
      gridConfig={{ cols: COLUMNS, rowHeight: ROW_HEIGHT }}
      dragConfig={{ handle: '.widget-drag-handle' }}
      resizeConfig={{ enabled: true }}
    >
      {widgets.map((widget) => (
        <div key={widget.widgetId} className="overflow-hidden rounded-xl">
          {renderWidget(widget)}
        </div>
      ))}
    </GridLayout>
  );
}
