import { Request, Response, NextFunction } from 'express';
import { ApplicationModel } from '../models/application.js';
import { verifyAppSecret } from '../utils/app-secret.js';
import { AppError } from '../utils/app-error.js';

export async function authenticateServer(req: Request, _res: Response, next: NextFunction) {
    const appId = req.header('x-app-id');
    const appSecret = req.header('x-app-secret');

    if (!appId || !appSecret) {
        throw new AppError(401, 'missing_credentials', 'APP_ID and APP_SECRET are required.');
    }

    const application = await ApplicationModel.findOne({ appId });
    if (!application || !application.appSecretHash) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    const secretOk = await verifyAppSecret(application.appSecretHash, appSecret);
    if (!secretOk) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    req.application = { id: application._id.toString(), appId: application.appId };
    next();
}
