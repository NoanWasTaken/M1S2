import { Request, Response } from 'express';
import { z } from 'zod';
import { AlertThresholdModel } from '../../models/alert-threshold.js';
import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';

const upsertSchema = z.object({
    appId:      z.string().min(1),
    threshold:  z.number().int().min(1),
    enabled:    z.boolean().optional(),
    cooldownMs: z.number().int().min(0).optional(),
});

async function resolveApp(appId: string, companyId: string) {
    const app = await ApplicationModel.findOne({ appId, companyId });
    if (!app) throw new AppError(404, 'app_not_found', 'Application not found.');
    return app;
}

export async function getAlertThreshold(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw new AppError(400, 'company_required', 'No company associated.');

    const { appId } = req.params as { appId: string };
    await resolveApp(appId, companyId);

    const threshold = await AlertThresholdModel.findOne({ appId, companyId }).lean();
    res.json({ threshold: threshold ?? null });
}

export async function upsertAlertThreshold(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw new AppError(400, 'company_required', 'No company associated.');

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'invalid_input', parsed.error.issues[0]?.message ?? 'Invalid data.');

    const { appId, threshold, enabled, cooldownMs } = parsed.data;
    await resolveApp(appId, companyId);

    const doc = await AlertThresholdModel.findOneAndUpdate(
        { appId, companyId },
        {
            $set: {
                threshold,
                ...(enabled !== undefined ? { enabled } : {}),
                ...(cooldownMs !== undefined ? { cooldownMs } : {}),
            },
            $setOnInsert: { appId, companyId },
        },
        { upsert: true, new: true },
    );

    res.json({ threshold: doc });
}

export async function deleteAlertThreshold(req: Request, res: Response): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId) throw new AppError(400, 'company_required', 'No company associated.');

    const { appId } = req.params as { appId: string };
    await resolveApp(appId, companyId);

    await AlertThresholdModel.deleteOne({ appId, companyId });
    res.json({ deleted: true });
}
