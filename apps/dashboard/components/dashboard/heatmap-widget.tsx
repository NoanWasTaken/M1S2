'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';

type HeatmapPoint = { x: number; y: number; count: number };

type HeatmapData = {
  points: HeatmapPoint[];
  totalClicks: number;
  pageWidth: number;
  pageHeight: number;
};

type HeatmapWidgetProps = {
  widgetId: string;
  appId: string;
  config?: { pageUrl?: string; period?: string };
};

const COLORS = [
  [20, 20, 180],
  [0, 188, 212],
  [76, 175, 80],
  [255, 235, 59],
  [244, 67, 54],
];

function gaussian(px: number, py: number, cx: number, cy: number, radius: number) {
  const dx = px - cx;
  const dy = py - cy;
  const dist2 = dx * dx + dy * dy;
  const sigma = radius / 3;
  return Math.exp(-dist2 / (2 * sigma * sigma));
}

function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  points: HeatmapPoint[],
  width: number,
  height: number,
) {
  const imageData = ctx.createImageData(width, height);
  const { data } = imageData;

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const radius = Math.max(width, height) * 0.04;

  for (const point of points) {
    const intensity = point.count / maxCount;
    for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
      for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
        const px = Math.round(point.x + dx);
        const py = Math.round(point.y + dy);
        if (px < 0 || px >= width || py < 0 || py >= height) continue;

        const g = gaussian(px, py, point.x, point.y, radius) * intensity;
        if (g < 0.01) continue;

        const idx = (py * width + px) * 4;
        const t = Math.min(g * 1.5, 1);
        const colorIdx = Math.min(Math.floor(t * (COLORS.length - 1)), COLORS.length - 2);
        const frac = t * (COLORS.length - 1) - colorIdx;

        const c0 = COLORS[colorIdx];
        const c1 = COLORS[Math.min(colorIdx + 1, COLORS.length - 1)];

        data[idx] = Math.min(255, data[idx] + (c0[0] + (c1[0] - c0[0]) * frac));
        data[idx + 1] = Math.min(255, data[idx + 1] + (c0[1] + (c1[1] - c0[1]) * frac));
        data[idx + 2] = Math.min(255, data[idx + 2] + (c0[2] + (c1[2] - c0[2]) * frac));
        data[idx + 3] = Math.min(255, data[idx + 3] + 40);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function HeatmapWidget({ widgetId: _widgetId, appId, config }: HeatmapWidgetProps) {
  const t = useTranslations('dashboard');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const pageUrl = config?.pageUrl;

  useEffect(() => {
    if (!pageUrl || !appId) {
      setHeatmapData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const end = new Date().toISOString();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    api.get<HeatmapData>('/api/v1/analytics/heatmap/data', { params: { url: pageUrl, start, end, applicationId: appId } })
      .then((res) => {
        setHeatmapData(res.data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err instanceof Error ? err.message : 'Request failed');
        setLoading(false);
      });
  }, [pageUrl, appId]);

  useEffect(() => {
    if (!heatmapData || !canvasRef.current) return;
    if (!heatmapData.pageWidth || !heatmapData.pageHeight) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = heatmapData.pageWidth;
    canvas.height = heatmapData.pageHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderHeatmap(ctx, heatmapData.points, heatmapData.pageWidth, heatmapData.pageHeight);
  }, [heatmapData]);

  useEffect(() => {
    if (!pageUrl || !appId) return;
    let cancelled = false;
    api.get(`/api/v1/analytics/heatmap/screenshot?url=${encodeURIComponent(pageUrl)}&applicationId=${encodeURIComponent(appId)}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data as Blob);
        setScreenshotUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pageUrl, appId]);

  if (!pageUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">{t('heatmapSelectPage')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {heatmapData && (
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="font-mono text-text-primary">{t('heatmapTotalClicks')}: {heatmapData.totalClicks}</span>
        </div>
      )}
      <div className="relative flex-1 overflow-auto">
        {screenshotUrl && (
          <img
            src={screenshotUrl}
            alt={pageUrl}
            className="block w-full"
            style={{ maxWidth: heatmapData?.pageWidth }}
          />
        )}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0"
          style={{ maxWidth: heatmapData?.pageWidth }}
        />
      </div>
    </div>
  );
}
