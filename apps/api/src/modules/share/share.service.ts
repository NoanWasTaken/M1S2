import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { SharedDashboardModel } from '../../models/shared-dashboard.js';
import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';

export type ShareTokenPayload = {
    companyId: string;
    appId: string;
    shareId: string;
};

export type ShareInfo = {
    shareId: string;
    appId: string;
    label: string;
    token: string;
    shareUrl: string;
    expiresAt: string | null;
    active: boolean;
    createdAt: string;
};

function makeToken(payload: ShareTokenPayload, expiresAt?: Date): string {
    const options: jwt.SignOptions = expiresAt
        ? { expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000) }
        : {};
    return jwt.sign(payload, env.shareTokenSecret, options);
}

export async function createShare(
    companyId: string,
    appId: string,
    label?: string,
    ttlDays?: number,
): Promise<ShareInfo> {
    const app = await ApplicationModel.findOne({ appId, companyId });
    if (!app) throw new AppError(404, 'app_not_found', 'Application not found.');

    await SharedDashboardModel.deleteOne({ companyId, appId });

    const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86_400_000) : null;

    const placeholder = new SharedDashboardModel({ companyId, appId, token: '__tmp__', label: label ?? '', expiresAt });
    await placeholder.save();

    const token = makeToken({ companyId, appId, shareId: placeholder._id.toString() }, expiresAt ?? undefined);
    placeholder.token = token;
    await placeholder.save();

    return formatShare(placeholder, token);
}

export async function getShare(companyId: string, appId: string): Promise<ShareInfo | null> {
    const doc = await SharedDashboardModel.findOne({ companyId, appId, active: true });
    if (!doc) return null;
    return formatShare(doc, doc.token);
}

export async function revokeShare(companyId: string, appId: string): Promise<void> {
    await SharedDashboardModel.deleteOne({ companyId, appId });
}

export async function verifyShareToken(token: string): Promise<ShareTokenPayload> {
    let payload: ShareTokenPayload;
    try {
        payload = jwt.verify(token, env.shareTokenSecret) as ShareTokenPayload;
    } catch {
        throw new AppError(401, 'invalid_share_token', 'Invalid or expired share token.');
    }

    const doc = await SharedDashboardModel.findOne({ token, active: true });
    if (!doc) throw new AppError(401, 'share_revoked', 'This share link has been revoked.');

    return payload;
}

function formatShare(doc: InstanceType<typeof SharedDashboardModel>, token: string): ShareInfo {
    return {
        shareId:   doc._id.toString(),
        appId:     doc.appId,
        label:     doc.label,
        token,
        shareUrl:  `${env.appWebUrl}/share/${token}`,
        expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
        active:    doc.active,
        createdAt: doc.createdAt.toISOString(),
    };
}
