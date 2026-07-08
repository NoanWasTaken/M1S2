import crypto from 'crypto';

export function generateTrackingId(kind: 'tag' | 'funnel'): string {
    return `${kind}_${crypto.randomBytes(16).toString('hex')}`;
}