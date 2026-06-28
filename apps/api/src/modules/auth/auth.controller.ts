import { Request, Response } from 'express';
import { registerSchema, loginSchema } from './auth.schema.js';
import { registerWebmaster, loginUser } from './auth.service.js';
import { AppError } from '../../utils/app-error.js';
import { env } from '../../config/env.js';

export async function register(req: Request, res: Response) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        const firstIssue = result.error.issues[0];
        throw new AppError(400, 'invalid_input', firstIssue?.message ?? 'Invalid data.');
    }

    const created = await registerWebmaster(result.data);
    res.status(201).json(created);
}

export async function login(req: Request, res: Response) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const { accessToken, refreshToken, user } = await loginUser(result.data);

    // The refresh token goes in a secure cookie, not in the JSON response
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken, user });
}