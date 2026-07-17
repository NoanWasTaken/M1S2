import { EventModel } from '../models/event.js';
import { ApplicationModel } from '../models/application.js';
import { pushToAccount } from './sse-registry.js';
import { checkAudiencePeak } from './peak-detector.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

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

export type CountryVisitors = { country: string; visitors: number };

async function countActiveVisitorsByCountry(appIds: string[]): Promise<CountryVisitors[]> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await EventModel.aggregate<{ _id: string; visitors: number }>([
    {
      $match: {
        appId: { $in: appIds },
        sessionId: { $ne: null },
        country: { $ne: null },
        occurredAt: { $gte: since },
      },
    },
    { $group: { _id: { country: '$country', sessionId: '$sessionId' } } },
    { $group: { _id: '$_id.country', visitors: { $sum: 1 } } },
    { $sort: { visitors: -1 } },
  ]);

  return rows.map((r) => ({ country: r._id, visitors: r.visitors }));
}

export async function getGlobeSnapshot(
  companyId: string,
): Promise<{ activeVisitors: number; byCountry: CountryVisitors[]; computedAt: string }> {
  const apps = await ApplicationModel.find({ companyId }).select('appId');
  const appIds = apps.map((a) => a.appId);
  const [activeVisitors, byCountry] = await Promise.all([
    countActiveVisitors(appIds),
    countActiveVisitorsByCountry(appIds),
  ]);
  return { activeVisitors, byCountry, computedAt: new Date().toISOString() };
}

export async function emitDashboardUpdate(appId: string): Promise<void> {
  try {
    const companyId = await resolveCompanyId(appId);
    if (!companyId) return;

    const apps = await ApplicationModel.find({ companyId }).select('appId');
    const appIds = apps.map((a) => a.appId);
    const [activeVisitors, byCountry] = await Promise.all([
      countActiveVisitors(appIds),
      countActiveVisitorsByCountry(appIds),
    ]);

    pushToAccount(companyId, 'dashboard:update', {
      accountId: companyId,
      activeVisitors,
      byCountry,
      computedAt: new Date().toISOString(),
    });

    void checkAudiencePeak(appId, companyId, activeVisitors);
  } catch (err) {
    console.error('[live-stats] emitDashboardUpdate failed:', err);
  }
}

export async function emitHeatmapPoint(
  appId: string,
  clickEvent: { url?: string; payload: Record<string, unknown> },
): Promise<void> {
  try {
    const companyId = await resolveCompanyId(appId);
    if (!companyId) return;

    const p = clickEvent.payload;
    const px = Number(p.px) || 0;
    const py = Number(p.py) || 0;
    const bx = Math.floor(px / 10) * 10;
    const by = Math.floor(py / 10) * 10;

    console.info('[live-stats] emitHeatmapPoint', { url: clickEvent.url, bx, by });
    pushToAccount(companyId, 'heatmap:point', {
      url: clickEvent.url,
      x: bx,
      y: by,
      count: 1,
    });
  } catch (err) {
    console.error('[live-stats] emitHeatmapPoint failed:', err);
  }
}