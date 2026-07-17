'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type HeatmapPointEvent = {
  url: string;
  x: number;
  y: number;
  count: number;
};

type UseHeatmapStreamOptions = {
  onPoint?: (point: HeatmapPointEvent) => void;
};

type UseHeatmapStreamResult = {
  connected: boolean;
};

export function useHeatmapStream({ onPoint }: UseHeatmapStreamOptions = {}): UseHeatmapStreamResult {
  const [connected, setConnected] = useState(false);
  const onPointRef = useRef(onPoint);

  useEffect(() => {
    onPointRef.current = onPoint;
  }, [onPoint]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/v1/realtime/stream`, { withCredentials: true });

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('heatmap:point', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as HeatmapPointEvent;
        console.info('[SSE] heatmap:point received', payload);
        onPointRef.current?.(payload);
      } catch {
        console.error('[SSE] Failed to parse heatmap:point', e.data);
      }
    });

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected };
}
