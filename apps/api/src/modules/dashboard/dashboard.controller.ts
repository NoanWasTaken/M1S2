import { Request, Response } from 'express';
import { overviewQuerySchema } from './dashboard.schema.js';
import { getOverviewData } from './dashboard.service.js';
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

  const data = await getOverviewData(companyId, result.data.period);
  res.json(data);
}
