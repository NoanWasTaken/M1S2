import { Request, Response, NextFunction } from 'express';
import { ApplicationModel } from '../models/application.js';
import { AppError } from '../utils/app-error.js';

export async function authenticateApp(req: Request, _res: Response, next: NextFunction) {
    const appId = req.header('x-app-id');
    if (!appId) {
        throw new AppError(401, 'missing_app_id', 'Missing APP_ID.');
    }

    const application = await ApplicationModel.findOne({ appId });
    if (!application) {
        throw new AppError(401, 'invalid_app_id', 'Invalid APP_ID.');
    }

    const origin = req.header('origin');
    const allowed = application.allowedOrigins ?? [];

    if (allowed.length === 0) {
        throw new AppError(403, 'origins_not_configured', 'No allowed origins configured for this application.');
    }

    if (!origin || !allowed.includes(origin)) {
        throw new AppError(403, 'origin_not_allowed', 'This origin is not allowed.');
    }

    req.application = { id: application._id.toString(), appId: application.appId };
    next();
}
