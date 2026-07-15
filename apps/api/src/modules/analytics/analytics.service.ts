import type { PipelineStage } from 'mongoose';
import { EventModel } from '../../models/event.js';
import { ApplicationModel } from '../../models/application.js';

const PERIOD_MS: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
};

function getPeriodStart(period: string): Date {
    const span = PERIOD_MS[period] ?? PERIOD_MS['24h'];
    return new Date(Date.now() - span);
}

async function resolveAppIds(companyId: string, appId?: string): Promise<string[]> {
    const applications = await ApplicationModel.find({ companyId }).select('appId');
    const appIds = applications.map((a) => a.appId);
    return appId ? appIds.filter((id) => id === appId) : appIds;
}

export type PageRow = {
    url: string;
    views: number;
    visitors: number;
    sessions: number;
    clicks: number;
    hovers: number;
    avgDuration: number;
    engagement: number;
};

export type ClickedElement = {
    label: string;
    href: string | null;
    nature: 'navigation' | 'action' | 'unknown';
    clicks: number;
};

export type PagesTotals = {
    views: number;
    visitors: number;
    clicks: number;
    avgDuration: number;
};

export async function getPagesData(
    companyId: string,
    period: string,
    appId?: string,
): Promise<{ pages: PageRow[]; totals: PagesTotals; topElements: ClickedElement[] }> {
    const empty = {
        pages: [],
        totals: { views: 0, visitors: 0, clicks: 0, avgDuration: 0 },
        topElements: [],
    };

    const appIds = await resolveAppIds(companyId, appId);
    if (appIds.length === 0) return empty;

    const start = getPeriodStart(period);
    const match = {
        appId: { $in: appIds },
        url: { $exists: true, $ne: null },
        occurredAt: { $gte: start },
    };

    const pagesPipeline: PipelineStage[] = [
        { $match: match },
        {
            $group: {
                _id: '$url',
                views: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
                clicks: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
                hovers: { $sum: { $cond: [{ $eq: ['$type', 'hover'] }, 1, 0] } },
                durations: {
                    $push: {
                        $cond: [{ $eq: ['$type', 'page_exit'] }, '$payload.duration', '$$REMOVE'],
                    },
                },
                visitors: { $addToSet: '$visitorId' },
                sessions: { $addToSet: '$sessionId' },
            },
        },
        {
            $project: {
                _id: 0,
                url: '$_id',
                views: 1,
                clicks: 1,
                hovers: 1,
                visitors: { $size: { $ifNull: ['$visitors', []] } },
                sessions: { $size: { $ifNull: ['$sessions', []] } },
                avgDuration: {
                    $let: {
                        vars: { avgSec: { $avg: '$durations' } },
                        in: { $round: [{ $ifNull: ['$$avgSec', 0] }, 0] },
                    },
                },
                engagement: {
                    $cond: [
                        { $gt: ['$views', 0] },
                        { $round: [{ $divide: ['$clicks', '$views'] }, 2] },
                        0,
                    ],
                },
            },
        },
        { $match: { views: { $gt: 0 } } },
        { $sort: { views: -1 } },
        { $limit: 100 },
    ];

    const elementsPipeline: PipelineStage[] = [
        { $match: { appId: { $in: appIds }, type: 'click', occurredAt: { $gte: start } } },
        {
            $group: {
                _id: {
                    label: { $ifNull: ['$payload.text', '$payload.tag'] },
                    href: '$payload.href',
                    nature: '$payload.nature',
                },
                clicks: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                label: { $ifNull: ['$_id.label', '—'] },
                href: '$_id.href',
                nature: { $ifNull: ['$_id.nature', 'unknown'] },
                clicks: 1,
            },
        },
        { $sort: { clicks: -1 } },
        { $limit: 8 },
    ];

    const [pages, topElements] = await Promise.all([
        EventModel.aggregate(pagesPipeline) as Promise<PageRow[]>,
        EventModel.aggregate(elementsPipeline) as Promise<ClickedElement[]>,
    ]);

    const uniqueVisitors = await EventModel.distinct('visitorId', {
        appId: { $in: appIds },
        type: 'pageview',
        occurredAt: { $gte: start },
    });

    const views = pages.reduce((s, p) => s + p.views, 0);
    const clicks = pages.reduce((s, p) => s + p.clicks, 0);
    const weighted = pages.reduce((s, p) => s + p.avgDuration * p.views, 0);

    return {
        pages,
        topElements,
        totals: {
            views,
            clicks,
            visitors: uniqueVisitors.length,
            avgDuration: views > 0 ? Math.round(weighted / views) : 0,
        },
    };
}

export type EventTypeRow = {
    type: string;
    count: number;
    browser: number;
    server: number;
    lastSeen: string;
};

export type RecentEvent = {
    type: string;
    url: string | null;
    source: 'browser' | 'server';
    sessionId: string | null;
    occurredAt: string;
};

export async function getEventsData(
    companyId: string,
    period: string,
    appId?: string,
): Promise<{ types: EventTypeRow[]; recent: RecentEvent[]; total: number }> {
    const appIds = await resolveAppIds(companyId, appId);
    if (appIds.length === 0) return { types: [], recent: [], total: 0 };

    const start = getPeriodStart(period);
    const match = { appId: { $in: appIds }, occurredAt: { $gte: start } };

    const typesPipeline: PipelineStage[] = [
        { $match: match },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                browser: { $sum: { $cond: [{ $eq: ['$source', 'browser'] }, 1, 0] } },
                server: { $sum: { $cond: [{ $eq: ['$source', 'server'] }, 1, 0] } },
                lastSeen: { $max: '$occurredAt' },
            },
        },
        { $project: { _id: 0, type: '$_id', count: 1, browser: 1, server: 1, lastSeen: 1 } },
        { $sort: { count: -1 } },
    ];

    const [types, recent] = await Promise.all([
        EventModel.aggregate(typesPipeline) as Promise<EventTypeRow[]>,
        EventModel.find(match)
            .sort({ occurredAt: -1 })
            .limit(50)
            .select('type url source sessionId occurredAt')
            .lean() as unknown as Promise<RecentEvent[]>,
    ]);

    const total = types.reduce((sum, t) => sum + t.count, 0);

    return { types, recent, total };
}

export type SeriesPoint = Record<string, string | number>;

export type TimeseriesQuery = {
    appId?: string;
    from?: string;
    to?: string;
    period?: string;
    urls?: string[];
    types?: string[];
};

function pickUnit(start: Date, end: Date): 'hour' | 'day' {
    const spanMs = end.getTime() - start.getTime();
    return spanMs <= 2 * 24 * 60 * 60 * 1000 ? 'hour' : 'day';
}

function resolveRange(q: TimeseriesQuery): { start: Date; end: Date } {
    if (q.from && q.to) {
        const start = new Date(q.from);
        const end = new Date(q.to);
        if (q.to.length <= 10) end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    return { start: getPeriodStart(q.period ?? '24h'), end: new Date() };
}

export async function getTimeseries(
    companyId: string,
    q: TimeseriesQuery,
): Promise<{ points: SeriesPoint[]; types: string[] }> {
    const appIds = await resolveAppIds(companyId, q.appId);
    if (appIds.length === 0) return { points: [], types: [] };

    const { start, end } = resolveRange(q);
    const unit = pickUnit(start, end);

    const match: Record<string, unknown> = {
        appId: { $in: appIds },
        occurredAt: { $gte: start, $lte: end },
    };
    if (q.urls && q.urls.length > 0) match.url = { $in: q.urls };
    if (q.types && q.types.length > 0) match.type = { $in: q.types };

    const pipeline: PipelineStage[] = [
        { $match: match },
        {
            $group: {
                _id: {
                    bucket: { $dateTrunc: { date: '$occurredAt', unit } },
                    type: '$type',
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.bucket': 1 } },
        {
            $project: {
                _id: 0,
                bucket: '$_id.bucket',
                type: '$_id.type',
                count: 1,
                time: {
                    $dateToString: {
                        format: unit === 'hour' ? '%H:%M' : '%d/%m',
                        date: '$_id.bucket',
                    },
                },
            },
        },
    ];

    const rows = (await EventModel.aggregate(pipeline)) as {
        bucket: Date;
        type: string;
        count: number;
        time: string;
    }[];

    const typeSet = new Set<string>();
    const byBucket = new Map<string, SeriesPoint>();

    for (const row of rows) {
        typeSet.add(row.type);
        const key = row.bucket.toISOString();
        const point = byBucket.get(key) ?? { time: row.time };
        point[row.type] = ((point[row.type] as number) ?? 0) + row.count;
        byBucket.set(key, point);
    }

    const types = [...typeSet].sort();

    const points = [...byBucket.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, point]) => {
            for (const type of types) {
                if (point[type] === undefined) point[type] = 0;
            }
            return point;
        });

    return { points, types };
}