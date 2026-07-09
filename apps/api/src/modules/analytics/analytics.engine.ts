import type { PipelineStage } from 'mongoose';
import type { AnalyticsQueryInput } from './analytics.schema.js';

// Build the $match stage from the config
function buildMatchStage(appId: string, query: AnalyticsQueryInput): PipelineStage.Match {
    const match: Record<string, unknown> = {
        appId,
        occurredAt: {
            $gte: new Date(query.period.start),
            $lte: new Date(query.period.end),
        },
    };

    // Add each filter
    for (const filter of query.filters) {
        match[filter.field] = filter.value;
    }

    return { $match: match };
}

// Build the $group stage from the metric
function buildGroupStage(metric: AnalyticsQueryInput['metric']): PipelineStage.Group {
    switch (metric) {
        case 'event_count':
            // Count events
            return { $group: { _id: null, value: { $sum: 1 } } };

        case 'unique_sessions':
            // Count unique sessions
            return { $group: { _id: null, sessions: { $addToSet: '$sessionId' } } };

        case 'unique_visitors':
            // Count unique visitors
            return { $group: { _id: null, visitors: { $addToSet: '$visitorId' } } };
    }
}

// The engine: transform a config
export function buildKpiPipeline(appId: string, query: AnalyticsQueryInput): PipelineStage[] {
    const pipeline: PipelineStage[] = [
        buildMatchStage(appId, query),
        buildGroupStage(query.metric),
    ];

    if (query.metric === 'unique_sessions') {
        pipeline.push({ $project: { _id: 0, value: { $size: '$sessions' } } });
    } else if (query.metric === 'unique_visitors') {
        pipeline.push({ $project: { _id: 0, value: { $size: '$visitors' } } });
    } else {
        pipeline.push({ $project: { _id: 0, value: 1 } });
    }

    return pipeline;
}

// Build a time series pipeline
export function buildTimeSeriesPipeline(appId: string, query: AnalyticsQueryInput): PipelineStage[] {
    const step = query.step ?? 'day';

    // Group stage
    let groupStage: PipelineStage.Group;
    if (query.metric === 'unique_sessions') {
        groupStage = {
            $group: {
                _id: { $dateTrunc: { date: '$occurredAt', unit: step } },
                sessions: { $addToSet: '$sessionId' },
            },
        };
    } else if (query.metric === 'unique_visitors') {
        groupStage = {
            $group: {
                _id: { $dateTrunc: { date: '$occurredAt', unit: step } },
                visitors: { $addToSet: '$visitorId' },
            },
        };
    } else {
        groupStage = {
            $group: {
                _id: { $dateTrunc: { date: '$occurredAt', unit: step } },
                value: { $sum: 1 },
            },
        };
    }

    // Project stage
    const projectStage: PipelineStage.Project = {
        $project: {
            _id: 0,
            time: '$_id',
            value:
                query.metric === 'unique_sessions'
                    ? { $size: '$sessions' }
                    : query.metric === 'unique_visitors'
                        ? { $size: '$visitors' }
                        : '$value',
        },
    };

    return [
        buildMatchStage(appId, query),
        groupStage,
        projectStage,
        { $sort: { time: 1 } },
    ];
}