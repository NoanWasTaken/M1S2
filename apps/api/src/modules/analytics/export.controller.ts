import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
import { exportPagesCsv, exportPagesPdf, exportEventsCsv, exportEventsPdf } from './export.service.js';

const exportQuerySchema = z.object({
    format: z.enum(['csv', 'pdf']).default('csv'),
    period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
    appId: z.string().optional(),
});

function getCompanyId(req: Request): string {
    const companyId = req.user?.companyId;
    if (!companyId) throw new AppError(400, 'company_required', 'No company associated.');
    return companyId;
}

export async function exportPages(req: Request, res: Response): Promise<void> {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'invalid_query', 'Invalid query parameters.');

    const { format, period, appId } = parsed.data;
    const companyId = getCompanyId(req);

    if (format === 'csv') {
        await exportPagesCsv(res, companyId, period, appId);
    } else {
        await exportPagesPdf(res, companyId, period, appId);
    }
}

export async function exportEvents(req: Request, res: Response): Promise<void> {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'invalid_query', 'Invalid query parameters.');

    const { format, period, appId } = parsed.data;
    const companyId = getCompanyId(req);

    if (format === 'csv') {
        await exportEventsCsv(res, companyId, period, appId);
    } else {
        await exportEventsPdf(res, companyId, period, appId);
    }
}
