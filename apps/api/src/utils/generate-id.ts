import crypto from 'crypto';

export function generateAppId(): string {
    // Generate a random 16-byte string and convert it to a hexadecimal string
    return `app_${crypto.randomBytes(16).toString('hex')}`;
}