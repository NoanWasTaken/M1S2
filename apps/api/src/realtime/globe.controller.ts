import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error.js';
import { getGlobeSnapshot } from './live-stats.js';

export async function getGlobe(req: Request, res: Response): Promise<void> {
    const companyId = req.user!.companyId;
    if (!companyId) {
        throw new AppError(400, 'no_company', 'No company associated with this account.');
    }
    const snapshot = await getGlobeSnapshot(companyId);
    res.json(snapshot);
}