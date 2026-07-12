import crypto from 'crypto';
import argon2 from 'argon2';

export function generateAppSecret(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashAppSecret(secret: string): Promise<string> {
    return argon2.hash(secret);
}

export function verifyAppSecret(hash: string, secret: string): Promise<boolean> {
    return argon2.verify(hash, secret);
}