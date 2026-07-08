import { DashboardConfigModel } from '../../models/dashboard-config.js';
import type { UpsertWidgetsInput } from './widget.schema.js';

export async function getWidgets(companyId: string) {
  const config = await DashboardConfigModel.findOne({ companyId }).lean();
  return config?.widgets ?? [];
}

export async function upsertWidgets(companyId: string, input: UpsertWidgetsInput) {
  const config = await DashboardConfigModel.findOneAndUpdate(
    { companyId },
    { $set: { widgets: input.widgets } },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  return config.widgets;
}
