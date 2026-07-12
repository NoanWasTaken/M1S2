import crypto from 'crypto';

export function generateAppId(): string {
    return `app_${crypto.randomBytes(16).toString('hex')}`;
}