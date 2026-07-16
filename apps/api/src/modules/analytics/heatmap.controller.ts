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
  console.info('[heatmap][screenshot] request', { applicationId, url });
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
  console.info('[heatmap][data] request', { applicationId, url, start, end });
  const data = await heatmapService.getClickData(applicationId, url, start, end);
  console.info('[heatmap][data] response', {
    applicationId,
    totalClicks: data.totalClicks,
    points: data.points.length,
    pageWidth: data.pageWidth,
    pageHeight: data.pageHeight,
  });
  res.json(data);
});
