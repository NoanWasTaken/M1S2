import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { AppError } from '../utils/app-error.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        throw new AppError(401, 'unauthenticated', 'Token missing.');
    }

    const token = header.substring(7);

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        throw new AppError(401, 'invalid_token', 'Invalid or expired token.');
    }
}
