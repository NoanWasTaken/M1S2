'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { create, type Heatmap, type HeatmapConfiguration } from 'heatmap.js';

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

export function HeatmapWidget({ appId, config }: HeatmapWidgetProps) {
  const t = useTranslations('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<Heatmap<'value', 'x', 'y'> | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const pageUrl = config?.pageUrl;
  const loading = Boolean(pageUrl && !heatmapData && !error);

  useEffect(() => {
    if (!pageUrl || !appId) return;
    let cancelled = false;

    const end = new Date().toISOString();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    api.get<HeatmapData>('/api/v1/analytics/heatmap/data', {
      params: { url: pageUrl, start, end, applicationId: appId },
    })
      .then((res) => {
        if (cancelled) return;
        setHeatmapData(res.data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Request failed');
      });

    return () => {
      cancelled = true;
      setHeatmapData(null);
      setError(null);
    };
  }, [pageUrl, appId]);

  useEffect(() => {
    if (!pageUrl || !appId) return;
    let cancelled = false;

    api.get(
      `/api/v1/analytics/heatmap/screenshot?url=${encodeURIComponent(pageUrl)}&applicationId=${encodeURIComponent(appId)}`,
      { responseType: 'blob' },
    )
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data as Blob);
        setScreenshotUrl(url);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [pageUrl, appId]);

  useEffect(() => {
    return () => {
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    };
  }, [screenshotUrl]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c || !imgSize || !heatmapData) return;

    const instance = create({
      container: c,
      radius: 25,
      blur: 0.7,
      maxOpacity: 0.8,
      minOpacity: 0.3,
      width: imgSize.w,
      height: imgSize.h,
      gradient: {
        '0.0': 'rgba(0,0,0,0)',
        '0.3': '#38bdf8',
        '0.5': '#818cf8',
        '0.7': '#fbbf24',
        '1.0': '#f87171',
      },
    } as HeatmapConfiguration & { width: number; height: number });

    heatmapRef.current = instance;

    const max = Math.max(...heatmapData.points.map((p) => p.count), 1);

    instance.setData({
      max,
      min: 0,
      data: heatmapData.points
        .filter((p) => p.x < imgSize.w && p.y < imgSize.h)
        .map((p) => ({
          x: p.x,
          y: p.y,
          value: p.count,
        })),
    });

    return () => {
      const canvas = c.querySelector('canvas');
      if (canvas) canvas.remove();
      heatmapRef.current = null;
    };
  }, [imgSize, heatmapData]);

  return (
    <div className="flex h-full flex-col gap-3">
      {heatmapData && (
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="font-mono text-text-primary">
            {t('heatmapTotalClicks')}: {heatmapData.totalClicks}
          </span>
        </div>
      )}
      <div className="relative flex-1 overflow-auto rounded-lg border border-border-subtle bg-bg-card">
        <div
          ref={containerRef}
          className="relative"
          style={imgSize ? { width: imgSize.w, height: imgSize.h, minHeight: 200 } : { minHeight: 200 }}
        >
          {(!pageUrl || loading) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-text-secondary">
                {!pageUrl ? t('heatmapSelectPage') : t('loading')}
              </p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {screenshotUrl && (
            <Image
              src={screenshotUrl}
              alt={pageUrl ?? ''}
              fill
              unoptimized
              className="block max-w-none object-none"
              onLoad={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
