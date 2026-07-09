import { Request, Response } from 'express';
import { upsertWidgetsSchema } from './widget.schema.js';
import { getWidgets, upsertWidgets } from './widget.service.js';
import { AppError } from '../../utils/app-error.js';

export async function getWidgetsHandler(req: Request, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new AppError(403, 'no_company', 'User has no associated company.');
  }

  const widgets = await getWidgets(companyId);
  res.json({ widgets });
}

export async function upsertWidgetsHandler(req: Request, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new AppError(403, 'no_company', 'User has no associated company.');
  }

  const result = upsertWidgetsSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_body', result.error.issues[0]?.message ?? 'Invalid request body.');
  }

  const widgets = await upsertWidgets(companyId, result.data);
  res.json({ widgets });
}
