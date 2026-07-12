import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'internal_error', message: 'An unexpected error occurred.' });
}