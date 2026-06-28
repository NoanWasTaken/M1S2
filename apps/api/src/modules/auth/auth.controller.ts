import { Request, Response } from 'express';
import { registerSchema } from './auth.schema.js';
import { registerWebmaster } from './auth.service.js';
import { AppError } from '../../utils/app-error.js';

export async function register(req: Request, res: Response) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        const firstIssue = result.error.issues[0];
    throw new AppError(400, 'invalid_input', firstIssue?.message ?? 'Invalid data.');
    }

    const created = await registerWebmaster(result.data);
    res.status(201).json(created);
}