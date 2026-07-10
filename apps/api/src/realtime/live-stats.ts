import { EventModel } from '../models/event.js';
import { ApplicationModel } from '../models/application.js';
import { broadcastDashboardUpdate } from './gateway.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // "active"

// appId -> companyId cache
const appToCompany = new Map<string, string>();

async function resolveCompanyId(appId: string): Promise<string | null> {
    const cached = appToCompany.get(appId);
    if (cached) return cached;

    const app = await ApplicationModel.findOne({ appId }).select('companyId');
    if (!app?.companyId) return null;

    const companyId = app.companyId.toString();
    appToCompany.set(appId, companyId);
    return companyId;
}

async function countActiveVisitors(appIds: string[]): Promise<number> {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const sessions = await EventModel.distinct('sessionId', {
        appId: { $in: appIds },
        sessionId: { $ne: null },
        occurredAt: { $gte: since },
    });
    return sessions.length;
}

 // Called right after ingestion
export async function emitDashboardUpdate(appId: string): Promise<void> {
    try {
        const companyId = await resolveCompanyId(appId);
        if (!companyId) return;

        const apps = await ApplicationModel.find({ companyId }).select('appId');
        const appIds = apps.map((a) => a.appId);

        const activeVisitors = await countActiveVisitors(appIds);

        broadcastDashboardUpdate(companyId, {
            accountId: companyId,
            activeVisitors,
            computedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[live-stats] emitDashboardUpdate failed:', err);
    }
}