import { EventModel } from '../../models/event.js';
import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';
import { buildKpiPipeline, buildTimeSeriesPipeline } from './analytics.engine.js';
import type { AnalyticsQueryInput } from './analytics.schema.js';

type Actor = { role: 'admin' | 'webmaster'; companyId?: string };

export async function runKpiQuery(actor: Actor, query: AnalyticsQueryInput) {
    const application = await ApplicationModel.findById(query.applicationId);
    if (!application) {
        throw new AppError(404, 'application_not_found', 'Application not found.');
    }
    if (actor.role === 'webmaster' && application.companyId.toString() !== actor.companyId) {
        throw new AppError(403, 'forbidden', 'This application does not belong to your company.');
    }

    const pipeline = buildKpiPipeline(application.appId, query);
    const result = await EventModel.aggregate(pipeline);
    const count = result[0]?.value ?? 0;

    // Rate mode
    if (query.mode === 'rate') {
        const sessionsPipeline = buildKpiPipeline(application.appId, {
            ...query,
            metric: 'unique_sessions',
            mode: 'count',
        });
        const sessionsResult = await EventModel.aggregate(sessionsPipeline);
        const sessions = sessionsResult[0]?.value ?? 0;

        const rate = sessions > 0 ? Math.round((count / sessions) * 100) / 100 : 0;
        return { metric: query.metric, mode: 'rate', value: rate };
    }

    return { metric: query.metric, mode: 'count', value: count };
}

export async function runTimeSeriesQuery(actor: Actor, query: AnalyticsQueryInput) {
    const application = await ApplicationModel.findById(query.applicationId);
    if (!application) {
        throw new AppError(404, 'application_not_found', 'Application not found.');
    }
    if (actor.role === 'webmaster' && application.companyId.toString() !== actor.companyId) {
        throw new AppError(403, 'forbidden', 'This application does not belong to your company.');
    }

    const pipeline = buildTimeSeriesPipeline(application.appId, query);
    const series = await EventModel.aggregate(pipeline);
    return { metric: query.metric, step: query.step ?? 'day', series };
}