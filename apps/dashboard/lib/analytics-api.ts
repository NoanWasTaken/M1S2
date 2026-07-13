import { api, getAccessToken } from './api-client';

export interface PageRow {
    url: string;
    views: number;
    visitors: number;
    sessions: number;
    clicks: number;
    hovers: number;
    avgDuration: number;
    engagement: number;
}

export interface ClickedElement {
    label: string;
    href: string | null;
    nature: 'navigation' | 'action' | 'unknown';
    clicks: number;
}

export interface PagesTotals {
    views: number;
    visitors: number;
    clicks: number;
    avgDuration: number;
}

export interface EventTypeRow {
    type: string;
    count: number;
    browser: number;
    server: number;
    lastSeen: string;
}

export interface RecentEvent {
    type: string;
    url: string | null;
    source: 'browser' | 'server';
    sessionId: string | null;
    occurredAt: string;
}

export async function fetchPages(period: string, appId?: string) {
    const res = await api.get<{ pages: PageRow[]; totals: PagesTotals; topElements: ClickedElement[] }>(
        '/api/v1/analytics/pages',
        { params: { period, ...(appId ? { appId } : {}) } },
    );
    return res.data;
}

export async function fetchEvents(period: string, appId?: string) {
    const res = await api.get<{ types: EventTypeRow[]; recent: RecentEvent[]; total: number }>(
        '/api/v1/analytics/events',
        { params: { period, ...(appId ? { appId } : {}) } },
    );
    return res.data;
}

export type SeriesPoint = Record<string, string | number>;

export type TimeseriesOptions = {
    appId?: string;
    from?: string;
    to?: string;
    urls?: string[];
    types?: string[];
};

export async function fetchTimeseries(period: string, opts: TimeseriesOptions = {}) {
    const res = await api.get<{ points: SeriesPoint[]; types: string[] }>(
        '/api/v1/analytics/timeseries',
        {
            params: {
                period,
                ...(opts.appId ? { appId: opts.appId } : {}),
                ...(opts.from ? { from: opts.from } : {}),
                ...(opts.to ? { to: opts.to } : {}),
                ...(opts.urls && opts.urls.length > 0 ? { urls: opts.urls.join(',') } : {}),
                ...(opts.types && opts.types.length > 0 ? { types: opts.types.join(',') } : {}),
            },
        },
    );
    return res.data;
}

export type ExportResource = 'pages' | 'events';
export type ExportFormat = 'csv' | 'pdf';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function exportAnalytics(
    resource: ExportResource,
    format: ExportFormat,
    period: string,
    appId?: string,
): Promise<string> {
    const params = new URLSearchParams({ format, period });
    if (appId) params.set('appId', appId);

    const url = `${BASE_URL}/api/v1/analytics/${resource}/export?${params.toString()}`;
    const token = getAccessToken();

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8;';
    const blob = new Blob([buffer], { type: mimeType });

    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    const today = new Date().toISOString().slice(0, 10);
    const filename = match?.[1] ?? `${resource}-export-${today}.${format}`;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    return filename;
}