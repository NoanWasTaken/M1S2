'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { getAccessToken } from '@/lib/api-client';
import { COUNTRY_CENTROIDS } from '@/lib/country-centroids';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type CountryVisitors = { country: string; visitors: number };

export type GlobePoint = {
    country: string;
    name: string;
    lat: number;
    lng: number;
    visitors: number;
};

type GlobeSnapshot = {
    activeVisitors: number;
    byCountry: CountryVisitors[];
    computedAt: string;
};

type DashboardUpdate = {
    accountId: string;
    activeVisitors: number;
    byCountry?: CountryVisitors[];
    computedAt: string;
};

function toPoints(rows: CountryVisitors[]): GlobePoint[] {
    const points: GlobePoint[] = [];
    for (const row of rows) {
        const c = COUNTRY_CENTROIDS[row.country?.toUpperCase()];
        if (!c) continue;
        points.push({
            country: row.country.toUpperCase(),
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            visitors: row.visitors,
        });
    }
    return points;
}

export type UseGlobeStreamResult = {
    points: GlobePoint[];
    totalActive: number;
    connected: boolean;
    loading: boolean;
};

export function useGlobeStream(): UseGlobeStreamResult {
    const [byCountry, setByCountry] = useState<CountryVisitors[]>([]);
    const [totalActive, setTotalActive] = useState(0);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        let cancelled = false;
        api
            .get<GlobeSnapshot>('/api/v1/realtime/globe')
            .then((res) => {
                if (cancelled) return;
                setByCountry(res.data.byCountry ?? []);
                setTotalActive(res.data.activeVisitors ?? 0);
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // 2) Live updates over the existing SSE stream.
    useEffect(() => {
        const token = getAccessToken();
        const url = `${API_URL}/api/v1/realtime/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.addEventListener('connected', () => setConnected(true));

        es.addEventListener('dashboard:update', (e: MessageEvent) => {
            try {
                const payload = JSON.parse(e.data) as DashboardUpdate;
                setTotalActive(payload.activeVisitors);
                if (payload.byCountry) setByCountry(payload.byCountry);
            } catch {
                // ignore malformed frame
            }
        });

        es.onerror = () => setConnected(false);

        return () => {
            es.close();
            esRef.current = null;
            setConnected(false);
        };
    }, []);

    const points = useMemo(() => toPoints(byCountry), [byCountry]);

    return { points, totalActive, connected, loading };
}