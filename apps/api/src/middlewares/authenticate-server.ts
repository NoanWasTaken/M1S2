import { Request, Response, NextFunction } from 'express';
import { ApplicationModel } from '../models/application.js';
import { verifyAppSecret } from '../utils/app-secret.js';
import { AppError } from '../utils/app-error.js';

export async function authenticateServer(req: Request, _res: Response, next: NextFunction) {
    // 1. Read APP_ID and APP_SECRET from headers
    const appId = req.header('x-app-id');
    const appSecret = req.header('x-app-secret');

    if (!appId || !appSecret) {
        throw new AppError(401, 'missing_credentials', 'APP_ID and APP_SECRET are required.');
    }

    // 2. Find application
    const application = await ApplicationModel.findOne({ appId });
    if (!application || !application.appSecretHash) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    // 3. Verify secret against stored hash
    const secretOk = await verifyAppSecret(application.appSecretHash, appSecret);
    if (!secretOk) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    // 4. Store app
    req.application = { id: application._id.toString(), appId: application.appId };
    next();
}