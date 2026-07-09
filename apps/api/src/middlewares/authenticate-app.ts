import { Request, Response, NextFunction } from 'express';
import { ApplicationModel } from '../models/application.js';
import { AppError } from '../utils/app-error.js';

export async function authenticateApp(req: Request, _res: Response, next: NextFunction) {
    // 1. Read APP_ID sent SDK
    const appId = req.header('x-app-id');
    if (!appId) {
        throw new AppError(401, 'missing_app_id', 'Missing APP_ID.');
    }

    // 2. Check if app exists
    const application = await ApplicationModel.findOne({ appId });
    if (!application) {
        throw new AppError(401, 'invalid_app_id', 'Invalid APP_ID.');
    }

    // 3. Check origin CORS
    const origin = req.header('origin');
    const allowed = application.allowedOrigins ?? [];
    // If origins are config origin must be part of it
    if (allowed.length > 0 && (!origin || !allowed.includes(origin))) {
        throw new AppError(403, 'origin_not_allowed', "This origin is not allowed.");
    }

    // 4. Sort app for next
    req.application = { id: application._id.toString(), appId: application.appId };
    next();
}