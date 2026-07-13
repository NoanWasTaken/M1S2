'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type DashboardUpdate = {
  accountId: string;
  activeVisitors: number;
  computedAt: string;
};

type UseDashboardStreamOptions = {
  onUpdate?: (payload: DashboardUpdate) => void;
};

type UseDashboardStreamResult = {
  connected: boolean;
  activeVisitors: number | null;
};

export function useDashboardStream(
  options: UseDashboardStreamOptions = {},
): UseDashboardStreamResult {
  const [connected, setConnected] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null);
  const onUpdateRef = useRef(options.onUpdate);

  useEffect(() => {
    onUpdateRef.current = options.onUpdate;
  }, [options.onUpdate]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/v1/realtime/stream`, {
      withCredentials: true,
    });

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('dashboard:update', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as DashboardUpdate;
        setActiveVisitors(payload.activeVisitors);
        onUpdateRef.current?.(payload);
      } catch {
        console.error('[SSE] Failed to parse dashboard:update', e.data);
      }
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected, activeVisitors };
}