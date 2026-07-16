import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
import { createShare, getShare, revokeShare } from './share.service.js';

const createSchema = z.object({
    appId:   z.string().min(1),
    label:   z.string().optional(),
    ttlDays: z.number().int().min(1).optional(),
});

function companyId(req: Request): string {
    const id = req.user?.companyId;
    if (!id) throw new AppError(400, 'company_required', 'No company associated.');
    return id;
}

export async function getShareLink(req: Request, res: Response): Promise<void> {
    const { appId } = req.params as { appId: string };
    const share = await getShare(companyId(req), appId);
    res.json({ share: share ?? null });
}

export async function createShareLink(req: Request, res: Response): Promise<void> {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'invalid_input', parsed.error.issues[0]?.message ?? 'Invalid data.');

    const { appId, label, ttlDays } = parsed.data;
    const share = await createShare(companyId(req), appId, label, ttlDays);
    res.status(201).json({ share });
}

export async function revokeShareLink(req: Request, res: Response): Promise<void> {
    const { appId } = req.params as { appId: string };
    await revokeShare(companyId(req), appId);
    res.json({ revoked: true });
}
