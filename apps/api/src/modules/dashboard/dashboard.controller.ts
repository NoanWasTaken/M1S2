import { Request, Response } from 'express';
import { overviewQuerySchema } from './dashboard.schema.js';
import { getOverviewData, getWidgetData } from './dashboard.service.js';
import { AppError } from '../../utils/app-error.js';

export async function overview(req: Request, res: Response) {
  const result = overviewQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw new AppError(400, 'invalid_query', result.error.issues[0]?.message ?? 'Invalid query parameters.');
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new AppError(403, 'no_company', 'User has no associated company.');
  }

  const data = await getOverviewData(companyId, result.data.period, result.data.appId);
  res.json(data);
}

export async function getWidgetDataHandler(req: Request, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new AppError(403, 'no_company', 'User has no associated company.');
  }

  const { widgetId } = req.params;
  const { start, end } = req.query;

  if (typeof start !== 'string' || typeof end !== 'string' || typeof widgetId !== 'string') {
    throw new AppError(400, 'invalid_params', 'start and end query params are required.');
  }

  const data = await getWidgetData(companyId, widgetId, {
    start: new Date(start),
    end: new Date(end),
  });

  if (data === null) {
    throw new AppError(404, 'widget_not_found', 'Widget not found.');
  }

  res.json(data);
}
