import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
import { getFunnelAnalytics } from './funnel.service.js';

const querySchema = z.object({
    period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
    appId: z.string().optional(),
});

export async function getFunnelStats(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw new AppError(400, 'company_required', 'No company associated.');

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'invalid_query', 'Invalid query parameters.');

    const { period, appId } = parsed.data;
    const { funnelId } = req.params as { funnelId: string };

    const result = await getFunnelAnalytics(funnelId, companyId, period, appId);
    res.json(result);
}