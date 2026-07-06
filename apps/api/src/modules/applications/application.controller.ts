// Application controller for the API

import { Request, Response } from 'express';
import { createApplicationSchema } from './application.schema.js';
import { createApplication, listApplications } from './application.service.js';
import { AppError } from '../../utils/app-error.js';

export async function postApplication(req: Request, res: Response) {
    const result = createApplicationSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
    }

    const creator = {
        userId: req.user!.sub,
        role: req.user!.role,
        companyId: req.user!.companyId,
    };

    const application = await createApplication(creator, result.data.name, result.data.companyId);
    res.status(201).json({ application });
}

export async function getApplications(req: Request, res: Response) {
    const creator = {
        userId: req.user!.sub,
        role: req.user!.role,
        companyId: req.user!.companyId,
    };

    const companyIdFromQuery = req.query.companyId as string | undefined;
    const applications = await listApplications(creator, companyIdFromQuery);
    res.json({ applications });
}