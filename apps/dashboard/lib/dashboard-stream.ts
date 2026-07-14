'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type DashboardUpdate = {
  accountId: string;
  activeVisitors: number;
  computedAt: string;
};

export type AudiencePeakAlert = {
  accountId: string;
  appId: string;
  currentVisitors: number;
  threshold: number;
  triggeredAt: string;
};

type UseDashboardStreamOptions = {
  onUpdate?: (payload: DashboardUpdate) => void;
  onAudiencePeak?: (payload: AudiencePeakAlert) => void;
};

type UseDashboardStreamResult = {
  connected: boolean;
  activeVisitors: number | null;
  peakAlert: AudiencePeakAlert | null;
};

export function useDashboardStream( options: UseDashboardStreamOptions = {} ): UseDashboardStreamResult {
  const [connected, setConnected] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null);
  const [peakAlert, setPeakAlert] = useState<AudiencePeakAlert | null>(null);
  const onUpdateRef = useRef(options.onUpdate);
  const onPeakRef = useRef(options.onAudiencePeak);

  useEffect(() => { onUpdateRef.current = options.onUpdate; }, [options.onUpdate]);
  useEffect(() => { onPeakRef.current = options.onAudiencePeak; }, [options.onAudiencePeak]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/v1/realtime/stream`, { withCredentials: true });

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('dashboard:update', (e: MessageEvent) => {
      try {
          const payload = JSON.parse(e.data) as DashboardUpdate;
          setActiveVisitors(payload.activeVisitors);
          onUpdateRef.current?.(payload);
      } catch {
          console.error('[SSE] Failed to parse dashboard:update', e.data);
      }
    });

    es.addEventListener('alert:audience-peak', (e: MessageEvent) => {
      try {
          const payload = JSON.parse(e.data) as AudiencePeakAlert;
          setPeakAlert(payload);
          onPeakRef.current?.(payload);
          setTimeout(() => setPeakAlert(null), 10_000);
      } catch {
          console.error('[SSE] Failed to parse alert:audience-peak', e.data);
      }
    });

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected, activeVisitors, peakAlert };
}