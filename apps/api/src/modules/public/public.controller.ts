import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
import { verifyShareToken } from '../share/share.service.js';
import { getOverviewData } from '../dashboard/dashboard.service.js';
import { getPagesData } from '../analytics/analytics.service.js';

const querySchema = z.object({
    period: z.enum(['24h', '7d', '30d', '90d']).default('24h'),
});

export async function getPublicDashboard(req: Request, res: Response): Promise<void> {
    const { token } = req.params as { token: string };
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'invalid_query', 'Invalid query parameters.');

    const { companyId, appId } = await verifyShareToken(token);
    const { period } = parsed.data;

    const [overview, pages] = await Promise.all([
        getOverviewData(companyId, period, appId),
        getPagesData(companyId, period, appId),
    ]);

    res.json({
        appId,
        period,
        kpis:     overview.kpis,
        traffic:  overview.traffic,
        topPages: pages.pages.slice(0, 10),
    });
}
