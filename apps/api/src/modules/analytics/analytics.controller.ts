import { Request, Response } from 'express';
import { analyticsQuerySchema } from './analytics.schema.js';
import { runKpiQuery, runTimeSeriesQuery } from './analytics.service.js';
import { AppError } from '../../utils/app-error.js';

export async function postKpiQuery(req: Request, res: Response) {
    const result = analyticsQuerySchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid query.');
    }

    const actor = { role: req.user!.role, companyId: req.user!.companyId };
    const data = await runKpiQuery(actor, result.data);
    res.json(data);
}

export async function postTimeSeriesQuery(req: Request, res: Response) {
    const result = analyticsQuerySchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid query.');
    }
    const actor = { role: req.user!.role, companyId: req.user!.companyId };
    const data = await runTimeSeriesQuery(actor, result.data);
    res.json(data);
  }