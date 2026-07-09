import { z } from 'zod';

export const positionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1),
  h: z.number().min(1),
});

export const widgetConfigSchema = z.object({
  widgetId: z.string().min(1),
  type: z.enum(['kpi', 'area-chart', 'live-list', 'data-table', 'donut-chart', 'progress-list']),
  title: z.string().default(''),
  position: positionSchema,
  config: z.record(z.unknown()).default({}),
});

export const upsertWidgetsSchema = z.object({
  widgets: z.array(widgetConfigSchema),
});

export type UpsertWidgetsInput = z.infer<typeof upsertWidgetsSchema>;
export type WidgetConfigInput = z.infer<typeof widgetConfigSchema>;
