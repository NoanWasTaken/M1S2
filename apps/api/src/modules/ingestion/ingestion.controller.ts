import { Request, Response } from 'express';
import { ingestBatchSchema } from './ingestion.schema.js';
import { ingestBrowserEvents, ingestServerEvents } from './ingestion.service.js';
import { AppError } from '../../utils/app-error.js';
import { resolveCountry } from '../../utils/geo.js';

export async function postBrowserEvents(req: Request, res: Response) {
  const result = ingestBatchSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const country = await resolveCountry(req);
  const outcome = await ingestBrowserEvents(req.application!.appId, result.data, country);
  res.status(202).json(outcome);
}

export async function postServerEvents(req: Request, res: Response) {
  const result = ingestBatchSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const outcome = await ingestServerEvents(req.application!.appId, result.data);
  res.status(202).json(outcome);
}