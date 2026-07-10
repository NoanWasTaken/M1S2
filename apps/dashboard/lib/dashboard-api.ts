import { api } from '@/lib/api-client';
import {
    kpiData as mockKpi,
    trafficData as mockTraffic,
    topPagesData as mockTopPages,
    trafficSourcesData as mockSources,
    devicesData as mockDevices,
} from '@/lib/mock-data';

type OverviewResponse = {
    kpis: {
        sessions: number;
        pageViews: number;
        bounceRate: number;
        avgDuration: string;
        sessionsDelta: number;
        pageViewsDelta: number;
    };
    traffic: { time: string; sessions: number; pageViews: number }[];
    topPages: { rank: number; name: string; path: string; views: number; avgDuration: string }[];
    sources: { label: string; value: number; color: string }[];
    devices: { label: string; percentage: number; icon: string }[];
    activePages: { path: string; visitors: number }[];
};

function compact(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

function toKpiCards(k: OverviewResponse['kpis']): typeof mockKpi {
    const ratio = k.sessions > 0 ? (k.pageViews / k.sessions).toFixed(2) : '0';
    return [
        { id: 'sessions', label: 'SESSIONS', value: compact(k.sessions), delta: k.sessionsDelta, subtext: 'vs. période précédente' },
        { id: 'pageViews', label: 'PAGES VUES', value: compact(k.pageViews), delta: k.pageViewsDelta, subtext: `pages / session : ${ratio}` },
        { id: 'bounceRate', label: 'TAUX DE REBOND', value: `${k.bounceRate}%`, delta: 0, subtext: 'objectif : < 40%' },
        { id: 'avgDuration', label: 'DURÉE MOYENNE', value: k.avgDuration, delta: 0, subtext: 'par session' },
    ];
}

export type DashboardData = {
    kpi: typeof mockKpi;
    traffic: typeof mockTraffic;
    topPages: typeof mockTopPages;
    sources: typeof mockSources;
    devices: typeof mockDevices;
    activePages: { path: string; visitors: number }[];
};

export const mockDashboardData: DashboardData = {
    kpi: mockKpi,
    traffic: mockTraffic,
    topPages: mockTopPages,
    sources: mockSources,
    devices: mockDevices,
    activePages: [],
};

export async function fetchDashboardData(period: string): Promise<DashboardData> {
    const res = await api.get<OverviewResponse>('/api/v1/dashboard/overview', { params: { period } });
    const d = res.data;
    return {
        kpi: toKpiCards(d.kpis),
        traffic: d.traffic,
        topPages: d.topPages as unknown as typeof mockTopPages,
        sources: d.sources,
        devices: d.devices,
        activePages: d.activePages ?? [],
    };
}