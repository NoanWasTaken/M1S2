import type { PipelineStage } from 'mongoose';
import { EventModel } from '../../models/event.js';
import { ConversionFunnelModel } from '../../models/conversion-funnel.js';
import { TrackingTagModel } from '../../models/tracking-tag.js';
import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';

const PERIOD_MS: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d':  7  * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
};

export type FunnelStepResult = {
    position: number;
    tagId: string;
    comment: string;
    sessions: number;
    conversionRate: number;
    dropRate: number;
};

export type FunnelAnalyticsResult = {
    funnel: { funnelId: string; comment: string; steps: { tagId: string; position: number }[] };
    steps: FunnelStepResult[];
    totalEntrants: number;
    totalConverted: number;
};

export async function getFunnelAnalytics(
    funnelId: string,
    companyId: string,
    period: string,
    appId?: string,
): Promise<FunnelAnalyticsResult> {
    const funnel = await ConversionFunnelModel
        .findOne({ funnelId, deletedAt: null, companyId })
        .lean();

    if (!funnel) {
        throw new AppError(404, 'funnel_not_found', 'Funnel not found.');
    }

    const applications = await ApplicationModel.find({ companyId }).select('appId').lean();
    let appIds = applications.map((a) => a.appId);
    if (appId) appIds = appIds.filter((id) => id === appId);
    if (appIds.length === 0) {
        return buildEmptyResult(funnel);
    }

    const start = new Date(Date.now() - (PERIOD_MS[period] ?? PERIOD_MS['7d']));
    const orderedSteps = [...funnel.steps].sort((a, b) => a.position - b.position);
    const tagIds = orderedSteps.map((s) => s.tagId);

    const tags = await TrackingTagModel
        .find({ tagId: { $in: tagIds } })
        .select('tagId comment')
        .lean();
    const tagComment = new Map(tags.map((t) => [t.tagId, t.comment]));

    const pipeline: PipelineStage[] = [
        {
            $match: {
                appId: { $in: appIds },
                type: 'tag',
                'payload.tagId': { $in: tagIds },
                occurredAt: { $gte: start },
                sessionId: { $ne: null },
            },
        },
        {
            $group: {
                _id: { tagId: '$payload.tagId', sessionId: '$sessionId' },
            },
        },
        {
            $group: {
                _id: '$_id.tagId',
                sessions: { $sum: 1 },
            },
        },
    ];

    const rows = await EventModel.aggregate(pipeline) as { _id: string; sessions: number }[];
    const sessionsByTag = new Map(rows.map((r) => [r._id, r.sessions]));

    const steps: FunnelStepResult[] = orderedSteps.map((step, idx) => {
        const sessions = sessionsByTag.get(step.tagId) ?? 0;
        const prevSessions = idx === 0 ? sessions : (sessionsByTag.get(orderedSteps[idx - 1].tagId) ?? 0);
        const conversionRate = prevSessions > 0 && idx > 0 ? Math.round((sessions / prevSessions) * 1000) / 1000 : 1;
        const dropRate = idx === 0 ? 0 : Math.round((1 - conversionRate) * 1000) / 1000;

        return {
            position: step.position,
            tagId: step.tagId,
            comment: tagComment.get(step.tagId) ?? step.tagId,
            sessions,
            conversionRate,
            dropRate,
        };
    });

    const totalEntrants = steps[0]?.sessions ?? 0;
    const totalConverted = steps[steps.length - 1]?.sessions ?? 0;

    return {
        funnel: {
            funnelId: funnel.funnelId,
            comment: funnel.comment,
            steps: orderedSteps.map((s) => ({ tagId: s.tagId, position: s.position })),
        },
        steps,
        totalEntrants,
        totalConverted,
    };
}

function buildEmptyResult(
    funnel: { funnelId: string; comment: string; steps: { tagId: string; position: number }[] },
): FunnelAnalyticsResult {
    const orderedSteps = [...funnel.steps].sort((a, b) => a.position - b.position);
    return {
        funnel: {
            funnelId: funnel.funnelId,
            comment: funnel.comment,
            steps: orderedSteps.map((s) => ({ tagId: s.tagId, position: s.position })),
        },
        steps: orderedSteps.map((s) => ({
            position: s.position,
            tagId: s.tagId,
            comment: s.tagId,
            sessions: 0,
            conversionRate: 0,
            dropRate: 0,
        })),
        totalEntrants: 0,
        totalConverted: 0,
    };
}