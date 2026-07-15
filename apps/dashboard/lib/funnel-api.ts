import { api } from './api-client';

export type FunnelSummary = {
    _id: string;
    funnelId: string;
    comment: string;
    steps: { tagId: string; position: number }[];
};

export type FunnelStepResult = {
    position: number;
    tagId: string;
    comment: string;
    sessions: number;
    conversionRate: number;
    dropRate: number;
};

export type FunnelAnalytics = {
    funnel: { funnelId: string; comment: string; steps: { tagId: string; position: number }[] };
    steps: FunnelStepResult[];
    totalEntrants: number;
    totalConverted: number;
};

export async function fetchFunnels(applicationId: string): Promise<FunnelSummary[]> {
    const res = await api.get<{ funnels: FunnelSummary[] }>(
        `/api/v1/tracking/applications/${applicationId}/funnels`,
    );
    return res.data.funnels;
}

export async function fetchFunnelStats(
    funnelId: string,
    period: string,
    appId?: string,
): Promise<FunnelAnalytics> {
    const res = await api.get<FunnelAnalytics>(`/api/v1/analytics/funnels/${funnelId}`, {
        params: { period, ...(appId ? { appId } : {}) },
    });
    return res.data;
}