import { Request, Response } from 'express';
import { ingestBatchSchema } from './ingestion.schema.js';
import { ingestBrowserEvents } from './ingestion.service.js';
import { AppError } from '../../utils/app-error.js';

export async function postBrowserEvents(req: Request, res: Response) {
    const result = ingestBatchSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
    }

    const outcome = await ingestBrowserEvents(req.application!.appId, result.data);
    res.status(202).json(outcome); // 202 = accepted
}