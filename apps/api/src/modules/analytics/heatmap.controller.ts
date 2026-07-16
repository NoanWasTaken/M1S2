import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { HeatmapService } from './heatmap.service.js';
import { heatmapQuerySchema, screenshotQuerySchema } from './analytics.schema.js';
import { AppError } from '../../utils/app-error.js';

const heatmapService = new HeatmapService();

export const getScreenshot = asyncHandler(async (req: Request, res: Response) => {
    const parsed = screenshotQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError(400, 'invalid_query', parsed.error.issues[0]?.message ?? 'Invalid query.');
    }
    const { url, applicationId } = parsed.data;
    const buf = await heatmapService.getScreenshot(applicationId, url);
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buf);
});

export const getClickData = asyncHandler(async (req: Request, res: Response) => {
    const parsed = heatmapQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new AppError(400, 'invalid_query', parsed.error.issues[0]?.message ?? 'Invalid query.');
    }
    const { url, start, end, applicationId } = parsed.data;
    const data = await heatmapService.getClickData(applicationId, url, start, end);
    res.json(data);
});
