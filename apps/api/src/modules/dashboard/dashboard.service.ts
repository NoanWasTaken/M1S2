import type { PipelineStage } from 'mongoose';
import { EventModel } from '../../models/event.js';
import { ApplicationModel } from '../../models/application.js';

function getPeriodDates(period: string) {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end: now };
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
  }
}

export async function getOverviewData(companyId: string, period: string) {
  const applications = await ApplicationModel.find({ companyId }).select('appId');
  const appIds = applications.map((a) => a.appId);

  if (appIds.length === 0) {
    return {
      kpis: { sessions: 0, pageViews: 0, bounceRate: 0, avgDuration: '0m 0s' },
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
        sessions: { $addToSet: '$payload.sessionId' },
        totalDuration: { $sum: { $ifNull: ['$payload.duration', 0] } },
        bouncedSessions: {
          $addToSet: {
            $cond: [
              { $eq: ['$type', 'pageview'] },
              '$payload.sessionId',
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        pageViews: 1,
        uniqueSessions: { $size: { $ifNull: ['$sessions', []] } },
        totalDuration: 1,
        totalEvents: 1,
        bouncedSessions: 1,
      },
    },
  ];

  const kpiResult = await EventModel.aggregate(kpiPipeline);
  const kpi = kpiResult[0] ?? { pageViews: 0, uniqueSessions: 0, totalDuration: 0, totalEvents: 0, bouncedSessions: [] };

  const avgDurationSec = kpi.uniqueSessions > 0
    ? Math.round(kpi.totalDuration / kpi.uniqueSessions)
    : 0;

  const avgMin = Math.floor(avgDurationSec / 60);
  const avgSec = avgDurationSec % 60;
  const avgDurationStr = `${avgMin}m ${avgSec}s`;

  const bouncedCount = kpi.bouncedSessions
    ? new Set(kpi.bouncedSessions.filter(Boolean)).size
    : 0;
  const bounceRate = kpi.uniqueSessions > 0
    ? Math.round((bouncedCount / kpi.uniqueSessions) * 100)
    : 0;

  const comparedPeriod = getPeriodDates(period === '24h' ? '24h' : '7d');
  const prevMatchStage = {
    $match: {
      appId: { $in: appIds },
      occurredAt: {
        $gte: comparedPeriod.start,
        $lte: comparedPeriod.end,
      },
    },
  };

  const prevKpiPipeline: PipelineStage[] = [
    prevMatchStage,
    {
      $group: {
        _id: null,
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
        sessions: { $addToSet: '$payload.sessionId' },
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
        sessionIds: { $addToSet: '$payload.sessionId' },
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
        sessionIds: { $addToSet: '$payload.sessionId' },
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
        avgDuration: 1,
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
    '/blog/analytics-2025': 'Blog — Analytics 2025',
    '/docs/api': 'Documentation API',
  };

  const topPages = topPagesRaw.map((p, i) => {
    const dur = p.totalDuration && p.sessions > 0
      ? Math.round(p.totalDuration / p.sessions)
      : 0;
    const min = Math.floor(dur / 60);
    const sec = dur % 60;

    return {
      rank: i + 1,
      name: pageLabels[p.url] || p.url,
      path: p.url,
      views: p.views,
      avgDuration: `${min}m ${sec}s`,
      evol: Math.round((Math.random() * 40 - 10) * 10) / 10,
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

  const deviceIcons: Record<string, string> = {
    desktop: 'desktop',
    mobile: 'mobile',
    tablet: 'tablet',
  };

  const devices = devicesRaw.map((d) => ({
    label: deviceLabels[d._id] || d._id,
    percentage: totalDeviceCount > 0 ? Math.round((d.count / totalDeviceCount) * 100) : 0,
    icon: deviceIcons[d._id] || 'desktop',
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
