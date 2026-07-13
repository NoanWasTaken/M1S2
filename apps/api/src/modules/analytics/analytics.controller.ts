import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
import { getPagesData, getEventsData, getTimeseries } from './analytics.service.js';

const baseSchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).default('24h'),
  appId: z.string().optional(),
});

const timeseriesSchema = baseSchema.extend({
  from: z.string().optional(),
  to: z.string().optional(),
  urls: z.string().optional(),
  types: z.string().optional(),
});

function companyOf(req: Request): string {
  const companyId = req.user!.companyId;
  if (!companyId) {
    throw new AppError(400, 'company_required', 'No company associated.');
  }
  return companyId;
}

function split(value?: string): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

export async function getPages(req: Request, res: Response) {
  const parsed = baseSchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'invalid_input', 'Invalid query parameters.');
  res.json(await getPagesData(companyOf(req), parsed.data.period, parsed.data.appId));
}

export async function getEvents(req: Request, res: Response) {
  const parsed = baseSchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'invalid_input', 'Invalid query parameters.');
  res.json(await getEventsData(companyOf(req), parsed.data.period, parsed.data.appId));
}

export async function getTimeseriesController(req: Request, res: Response) {
  const parsed = timeseriesSchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'invalid_input', 'Invalid query parameters.');

  const { period, appId, from, to, urls, types } = parsed.data;

  res.json(
    await getTimeseries(companyOf(req), {
      appId,
      period,
      from,
      to,
      urls: split(urls),
      types: split(types),
    }),
  );
}