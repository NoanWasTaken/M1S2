import type { PipelineStage } from 'mongoose';
import type { AnalyticsQueryInput } from './analytics.schema.js';

export type WidgetConfig = {
  type: 'kpi' | 'timeseries' | 'heatmap';
  appId: string;
  metric: string;
  filters: { field: string; value: unknown }[];
  period: { start: Date; end: Date };
  step?: 'hour' | 'day' | 'week' | 'month';
  mode: 'count' | 'rate';
  pageUrl?: string;
};

function buildMatchStage(appId: string, query: AnalyticsQueryInput): PipelineStage.Match {
  const match: Record<string, unknown> = {
    appId,
    occurredAt: {
      $gte: new Date(query.period.start),
      $lte: new Date(query.period.end),
    },
  };

  for (const filter of query.filters) {
    match[filter.field] = filter.value;
  }

  return { $match: match };
}

function buildGroupStage(metric: AnalyticsQueryInput['metric']): PipelineStage.Group {
  switch (metric) {
    case 'event_count':
      return { $group: { _id: null, value: { $sum: 1 } } };

    case 'unique_sessions':
      return { $group: { _id: null, sessions: { $addToSet: '$sessionId' } } };

    case 'unique_visitors':
      return { $group: { _id: null, visitors: { $addToSet: '$visitorId' } } };
  }
}

export function buildKpiPipeline(appId: string, query: AnalyticsQueryInput): PipelineStage[] {
  const pipeline: PipelineStage[] = [buildMatchStage(appId, query), buildGroupStage(query.metric)];

  if (query.metric === 'unique_sessions') {
    pipeline.push({ $project: { _id: 0, value: { $size: '$sessions' } } });
  } else if (query.metric === 'unique_visitors') {
    pipeline.push({ $project: { _id: 0, value: { $size: '$visitors' } } });
  } else {
    pipeline.push({ $project: { _id: 0, value: 1 } });
  }

  return pipeline;
}

export function buildTimeSeriesPipeline(
  appId: string,
  query: AnalyticsQueryInput,
): PipelineStage[] {
  const step = query.step ?? 'day';

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

  return [buildMatchStage(appId, query), groupStage, projectStage, { $sort: { time: 1 } }];
}

function widgetConfigToQuery(config: WidgetConfig): AnalyticsQueryInput {
  return {
    applicationId: config.appId,
    metric: config.metric as AnalyticsQueryInput['metric'],
    filters: config.filters.map((f) => ({
      field: f.field as AnalyticsQueryInput['filters'][number]['field'],
      value: String(f.value),
    })),
    period: { start: config.period.start.toISOString(), end: config.period.end.toISOString() },
    step: config.step,
    mode: config.mode,
  };
}

export function buildPipeline(config: WidgetConfig): PipelineStage[] {
  switch (config.type) {
    case 'kpi':
      return buildKpiPipeline(config.appId, widgetConfigToQuery(config));
    case 'timeseries':
      return buildTimeSeriesPipeline(config.appId, widgetConfigToQuery(config));
    case 'heatmap':
      return buildHeatmapPipeline(config);
  }
}

export function buildHeatmapPipeline(config: WidgetConfig): PipelineStage[] {
  const match: Record<string, unknown> = {
    appId: config.appId,
    'payload.px': { $exists: true },
    'payload.py': { $exists: true },
    occurredAt: { $gte: config.period.start, $lte: config.period.end },
  };
  if (config.pageUrl) {
    match.url = config.pageUrl;
  }
  for (const f of config.filters) {
    match[`payload.${f.field}`] = f.value;
  }

  return [
    { $match: match },
    {
      $project: {
        bx: { $floor: { $divide: ['$payload.px', 10] } },
        by: { $floor: { $divide: ['$payload.py', 10] } },
        pw: '$payload.pw',
        ph: '$payload.ph',
      },
    },
    {
      $group: {
        _id: { bx: '$bx', by: '$by' },
        count: { $sum: 1 },
        pageWidth: { $first: '$pw' },
        pageHeight: { $first: '$ph' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5000 },
    {
      $project: {
        _id: 0,
        x: { $multiply: ['$_id.bx', 10] },
        y: { $multiply: ['$_id.by', 10] },
        count: 1,
        pageWidth: 1,
        pageHeight: 1,
      },
    },
    {
      $group: {
        _id: null,
        points: { $push: { x: '$x', y: '$y', count: '$count' } },
        totalClicks: { $sum: '$count' },
        pageWidth: { $first: '$pageWidth' },
        pageHeight: { $first: '$pageHeight' },
      },
    },
    { $project: { _id: 0, points: 1, totalClicks: 1, pageWidth: 1, pageHeight: 1 } },
  ];
}
