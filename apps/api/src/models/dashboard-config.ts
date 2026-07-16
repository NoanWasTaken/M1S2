import { Schema, model, InferSchemaType } from 'mongoose';

const widgetConfigSchema = new Schema(
  {
    widgetId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['kpi', 'area-chart', 'live-list', 'data-table', 'donut-chart', 'progress-list', 'heatmap', 'globe'],
    },
    title: { type: String, default: '' },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      w: { type: Number, required: true },
      h: { type: Number, required: true },
    },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const dashboardConfigSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    widgets: { type: [widgetConfigSchema], default: [] },
  },
  { timestamps: true },
);

export type DashboardConfig = InferSchemaType<typeof dashboardConfigSchema>;
export type WidgetConfig = {
  widgetId: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
};
export const DashboardConfigModel = model('DashboardConfig', dashboardConfigSchema);
