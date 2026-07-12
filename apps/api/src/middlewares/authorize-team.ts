import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.js';

export function denyMembers(req: Request, _res: Response, next: NextFunction) {
    if (!req.user) {
        throw new AppError(401, 'unauthenticated', 'Unauthenticated.');
    }

    if (req.user.role === 'admin') {
        return next();
    }

    if (req.user.teamRole === 'member') {
        throw new AppError(
            403,
            'member_forbidden',
            'Members have read-only access. Ask your company owner.',
        );
    }

    next();
}