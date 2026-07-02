import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.js';

export function authorize(...allowedRoles: Array<'admin' | 'webmaster'>) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new AppError(401, 'unauthenticated', 'Unauthenticated.');
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new AppError(403, 'forbidden', "You don't have the necessary rights.");
        }

        next();
    };
}