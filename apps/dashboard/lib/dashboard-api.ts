import { api } from '@/lib/api-client';
import {
    kpiData as mockKpi,
    trafficData as mockTraffic,
    topPagesData as mockTopPages,
    trafficSourcesData as mockSources,
    devicesData as mockDevices,
} from '@/lib/mock-data';

export type KpiItem = {
    id: 'sessions' | 'pageViews' | 'bounceRate' | 'avgDuration';
    value: string;
    delta: number;
    ratio?: string;
};

export type SourceItem = {
    key: string;
    value: number;
    color: string;
};

export type DeviceItem = {
    key: string;
    percentage: number;
    icon: string;
};

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
    sources: SourceItem[];
    devices: DeviceItem[];
    activePages: { path: string; visitors: number }[];
};

function compact(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

function toKpiCards(k: OverviewResponse['kpis']): KpiItem[] {
    const ratio = k.sessions > 0 ? (k.pageViews / k.sessions).toFixed(2) : '0';
    return [
        { id: 'sessions', value: compact(k.sessions), delta: k.sessionsDelta },
        { id: 'pageViews', value: compact(k.pageViews), delta: k.pageViewsDelta, ratio },
        { id: 'bounceRate', value: `${k.bounceRate}%`, delta: 0 },
        { id: 'avgDuration', value: k.avgDuration, delta: 0 },
    ];
}

export type DashboardData = {
    kpi: KpiItem[];
    traffic: typeof mockTraffic;
    topPages: typeof mockTopPages;
    sources: SourceItem[];
    devices: DeviceItem[];
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

export async function fetchDashboardData(period: string, appId?: string): Promise<DashboardData> {
    const res = await api.get<OverviewResponse>('/api/v1/dashboard/overview', { params: { period, appId } });
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
