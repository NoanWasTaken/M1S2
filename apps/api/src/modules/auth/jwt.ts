import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export type TokenPayload = {
    sub: string;
    role: 'admin' | 'webmaster';
    companyId?: string;
    teamRole?: 'owner' | 'member' | null;
    impersonatedBy?: string;
};

export function signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
}