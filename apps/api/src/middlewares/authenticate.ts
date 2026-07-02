import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { AppError } from '../utils/app-error.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    // The header must exist and start
    if (!header || !header.startsWith('Bearer ')) {
        throw new AppError(401, 'unauthenticated', 'Token missing.');
    }

    // Extract the token
    const token = header.substring(7);

    // Verify the token; if it is invalid/expired, we refuse
    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        throw new AppError(401, 'invalid_token', 'Invalid or expired token.');
    }
}