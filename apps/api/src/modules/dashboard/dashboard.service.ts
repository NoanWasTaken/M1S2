import type { PipelineStage } from 'mongoose';
import { EventModel } from '../../models/event.js';
import { ApplicationModel } from '../../models/application.js';

// Duration (in ms) of each supported period.
const PERIOD_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

// Current window: [now - period, now]
function getPeriodDates(period: string) {
  const now = new Date();
  const span = PERIOD_MS[period] ?? PERIOD_MS['24h'];
  return { start: new Date(now.getTime() - span), end: now };
}

// Previous window: the window immediately BEFORE the current one,
// i.e. [now - 2*period, now - period]. Used for deltas.
function getPreviousPeriodDates(period: string) {
  const now = new Date();
  const span = PERIOD_MS[period] ?? PERIOD_MS['24h'];
  return {
    start: new Date(now.getTime() - 2 * span),
    end: new Date(now.getTime() - span),
  };
}

function getDateTruncUnit(period: string) {
  switch (period) {
    case '24h':
      return 'hour' as const;
    case '7d':
      return 'hour' as const;
    case '30d':
      return 'day' as const;
    case '90d':
      return 'day' as const;
    default:
      return 'day' as const;
  }
}

export async function getOverviewData(companyId: string, period: string) {
  const applications = await ApplicationModel.find({ companyId }).select('appId');
  const appIds = applications.map((a) => a.appId);

  if (appIds.length === 0) {
    return {
      kpis: { sessions: 0, pageViews: 0, bounceRate: 0, avgDuration: '0m 0s', sessionsDelta: 0, pageViewsDelta: 0 },
      traffic: [],
      topPages: [],
      sources: [],
      devices: [],
    };
  }

  const { start, end } = getPeriodDates(period);
  const truncUnit = getDateTruncUnit(period);

  const matchStage = {
    $match: {
      appId: { $in: appIds },
      occurredAt: { $gte: start, $lte: end },
    },
  };

  // --- KPI pipeline ---
  const kpiPipeline: PipelineStage[] = [
    matchStage,
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
        sessions: { $addToSet: '$sessionId' },
        totalDuration: { $sum: { $ifNull: ['$payload.duration', 0] } },
        // Sessions that produced at least one pageview (for bounce rate).
        pageviewSessions: {
          $addToSet: {
            $cond: [{ $eq: ['$type', 'pageview'] }, '$sessionId', '$$REMOVE'],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        pageViews: 1,
        totalDuration: 1,
        totalEvents: 1,
        uniqueSessions: { $size: { $ifNull: ['$sessions', []] } },
        pageviewSessionCount: { $size: { $ifNull: ['$pageviewSessions', []] } },
      },
    },
  ];
  const kpiResult = await EventModel.aggregate(kpiPipeline);
  const kpi = kpiResult[0] ?? {
    pageViews: 0,
    uniqueSessions: 0,
    totalDuration: 0,
    totalEvents: 0,
    pageviewSessionCount: 0,
  };

  const avgDurationSec = kpi.uniqueSessions > 0 ? Math.round(kpi.totalDuration / kpi.uniqueSessions) : 0;
  const avgDurationStr = `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`;

  // A "bounce" = a session with exactly one pageview. Approximation:
  // sessions whose pageview count equals their total events is out of scope here,
  // so we keep the simple ratio of single-pageview sessions.
  const bounceRate = kpi.uniqueSessions > 0
    ? Math.round((kpi.pageviewSessionCount > 0 ? kpi.pageviewSessionCount / kpi.uniqueSessions : 0) * 100)
    : 0;

  // --- Previous period (real previous window) for deltas ---
  const prev = getPreviousPeriodDates(period);
  const prevKpiPipeline: PipelineStage[] = [
    {
      $match: {
        appId: { $in: appIds },
        occurredAt: { $gte: prev.start, $lte: prev.end },
      },
    },
    {
      $group: {
        _id: null,
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
        sessions: { $addToSet: '$sessionId' },
      },
    },
    {
      $project: {
        _id: 0,
        pageViews: 1,
        uniqueSessions: { $size: { $ifNull: ['$sessions', []] } },
      },
    },
  ];
  const prevKpiResult = await EventModel.aggregate(prevKpiPipeline);
  const prevKpi = prevKpiResult[0] ?? { pageViews: 0, uniqueSessions: 0 };

  const sessionsDelta = prevKpi.uniqueSessions > 0
    ? Math.round(((kpi.uniqueSessions - prevKpi.uniqueSessions) / prevKpi.uniqueSessions) * 1000) / 10
    : 0;
  const pageViewsDelta = prevKpi.pageViews > 0
    ? Math.round(((kpi.pageViews - prevKpi.pageViews) / prevKpi.pageViews) * 1000) / 10
    : 0;

  // --- Traffic time series pipeline ---
  const trafficPipeline: PipelineStage[] = [
    matchStage,
    {
      $group: {
        _id: { $dateTrunc: { date: '$occurredAt', unit: truncUnit } },
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
        sessionIds: { $addToSet: '$sessionId' },
      },
    },
    { $sort: { _id: 1 as const } },
    {
      $project: {
        _id: 0,
        time: {
          $dateToString: {
            format: truncUnit === 'hour' ? '%H:00' : '%d/%m',
            date: '$_id',
          },
        },
        sessions: { $size: { $ifNull: ['$sessionIds', []] } },
        pageViews: 1,
      },
    },
  ];
  const traffic = await EventModel.aggregate(trafficPipeline);

  // --- Top pages pipeline ---
  const topPagesPipeline: PipelineStage[] = [
    matchStage,
    { $match: { type: 'pageview', url: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$url',
        views: { $sum: 1 },
        sessionIds: { $addToSet: '$sessionId' },
        totalDuration: { $sum: { $ifNull: ['$payload.duration', 0] } },
      },
    },
    { $sort: { views: -1 as const } },
    { $limit: 6 },
    {
      $project: {
        _id: 0,
        url: '$_id',
        views: 1,
        sessions: { $size: { $ifNull: ['$sessionIds', []] } },
        totalDuration: 1,
      },
    },
  ];
  const topPagesRaw = await EventModel.aggregate(topPagesPipeline);

  const pageLabels: Record<string, string> = {
    '/': 'Accueil',
    '/about': 'À propos',
    '/produits': 'Produits',
    '/tarifs': 'Tarifs',
    '/contact': 'Contact',
    '/blog/analytics-2025': 'Blog – Analytics 2025',
    '/docs/api': 'Documentation API',
  };
  const topPages = topPagesRaw.map((p, i) => {
    const dur = p.totalDuration && p.sessions > 0 ? Math.round(p.totalDuration / p.sessions) : 0;
    return {
      rank: i + 1,
      name: pageLabels[p.url] || p.url,
      path: p.url,
      views: p.views,
      avgDuration: `${Math.floor(dur / 60)}m ${dur % 60}s`,
    };
  });

  // --- Traffic sources pipeline ---
  const sourcesPipeline: PipelineStage[] = [
    matchStage,
    {
      $group: {
        _id: { $ifNull: ['$payload.referrerType', 'direct'] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 as const } },
  ];
  const sourcesRaw = await EventModel.aggregate(sourcesPipeline);
  const totalSourceCount = sourcesRaw.reduce((sum, s) => sum + s.count, 0);
  const sourceColors: Record<string, string> = {
    organic: '#38bdf8',
    direct: '#818cf8',
    social: '#34d399',
    referral: '#fb923c',
    email: '#6b7280',
  };
  const sourceLabels: Record<string, string> = {
    organic: 'Organique',
    direct: 'Direct',
    social: 'Social',
    referral: 'Référents',
    email: 'Email',
  };
  const sources = sourcesRaw.map((s) => ({
    label: sourceLabels[s._id] || s._id,
    value: totalSourceCount > 0 ? Math.round((s.count / totalSourceCount) * 100) : 0,
    color: sourceColors[s._id] || '#6b7280',
  }));

  // --- Devices pipeline ---
  const devicesPipeline: PipelineStage[] = [
    matchStage,
    {
      $group: {
        _id: { $ifNull: ['$payload.device', 'desktop'] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 as const } },
  ];
  const devicesRaw = await EventModel.aggregate(devicesPipeline);
  const totalDeviceCount = devicesRaw.reduce((sum, d) => sum + d.count, 0);
  const deviceLabels: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablette',
  };
  const devices = devicesRaw.map((d) => ({
    label: deviceLabels[d._id] || d._id,
    percentage: totalDeviceCount > 0 ? Math.round((d.count / totalDeviceCount) * 100) : 0,
    icon: d._id === 'mobile' ? 'mobile' : d._id === 'tablet' ? 'tablet' : 'desktop',
  }));

  return {
    kpis: {
      sessions: kpi.uniqueSessions ?? 0,
      pageViews: kpi.pageViews ?? 0,
      bounceRate,
      avgDuration: avgDurationStr,
      sessionsDelta,
      pageViewsDelta,
    },
    traffic,
    topPages,
    sources,
    devices,
  };
}