import crypto from 'crypto';
import argon2 from 'argon2';

// Generate secret
export function generateAppSecret(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

// Hash secret
export function hashAppSecret(secret: string): Promise<string> {
    return argon2.hash(secret);
}

// Verify secret
export function verifyAppSecret(hash: string, secret: string): Promise<boolean> {
    return argon2.verify(hash, secret);
}