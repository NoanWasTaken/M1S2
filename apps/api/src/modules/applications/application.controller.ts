import { Request, Response } from 'express';
import { AppError } from '../../utils/app-error.js';
import { assertValidObjectId } from '../../utils/validate-id.js';
import { createApplicationSchema, updateOriginsSchema } from './application.schema.js';
import {
    createApplication,
    listApplications,
    deleteApplication,
    generateApplicationSecret,
    deleteApplicationSecret,
    updateAllowedOrigins,
} from './application.service.js';


export async function postApplication(req: Request, res: Response) {
    const result = createApplicationSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
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

export async function postApplicationSecret(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const creator = { userId: req.user!.sub, role: req.user!.role, companyId: req.user!.companyId };
    const result = await generateApplicationSecret(req.params.id as string, creator);
    res.status(201).json(result);
}

export async function deleteApplicationSecretController(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const creator = { userId: req.user!.sub, role: req.user!.role, companyId: req.user!.companyId };
    const result = await deleteApplicationSecret(req.params.id as string, creator);
    res.json(result);
}

export async function deleteApplicationController(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const creator = { userId: req.user!.sub, role: req.user!.role, companyId: req.user!.companyId };
    const result = await deleteApplication(req.params.id as string, creator);
    res.json(result);
}

export async function putAllowedOrigins(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const result = updateOriginsSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const creator = { userId: req.user!.sub, role: req.user!.role, companyId: req.user!.companyId };
    const application = await updateAllowedOrigins(req.params.id as string, creator, result.data.allowedOrigins);
    res.json({ application });
}