'use client';

/* eslint-disable @next/next/no-img-element -- pixel-perfect heatmap overlay needs raw img */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { create, type Heatmap, type HeatmapConfiguration } from 'heatmap.js';
import { useHeatmapStream, type HeatmapPointEvent } from '@/lib/use-heatmap-stream';

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
  const heatmapPointsRef = useRef<HeatmapPoint[]>([]);
  const pageWidthRef = useRef(1);
  const pageHeightRef = useRef(1);
  const imgSizeRef = useRef<{ w: number; h: number } | null>(null);
  const pageUrlRef = useRef(config?.pageUrl);

  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [totalClicks, setTotalClicks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const pageUrl = config?.pageUrl;
  const loading = Boolean(pageUrl && !heatmapData && !error);

  useEffect(() => {
    pageUrlRef.current = pageUrl;
  }, [pageUrl]);

  const onPoint = useCallback((point: HeatmapPointEvent) => {
    if (point.url !== pageUrlRef.current) return;

    console.info('[heatmap] SSE point', { point, pageUrl: pageUrlRef.current });

    const points = heatmapPointsRef.current;
    const existing = points.find((p) => p.x === point.x && p.y === point.y);
    if (existing) {
      existing.count += point.count;
    } else {
      points.push({ x: point.x, y: point.y, count: point.count });
    }
    setTotalClicks((prev) => prev + point.count);

    const instance = heatmapRef.current;
    const size = imgSizeRef.current;
    const pw = pageWidthRef.current;
    const ph = pageHeightRef.current;
    if (!instance || !size) return;

    const scaleX = size.w / pw;
    const scaleY = size.h / ph;
    const max = Math.max(...points.map((p) => p.count), 1);
    const mapped = points.map((p) => ({
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY),
      value: p.count,
    }));
    instance.setData({ max, min: 0, data: mapped });
  }, []);

  useHeatmapStream({ onPoint });

  useEffect(() => {
    if (!pageUrl || !appId) return;
    let cancelled = false;

    const end = new Date().toISOString();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    api
      .get<HeatmapData>('/api/v1/analytics/heatmap/data', {
        params: { url: pageUrl, start, end, applicationId: appId },
      })
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        heatmapPointsRef.current = d.points.map((p) => ({ ...p }));
        pageWidthRef.current = d.pageWidth;
        pageHeightRef.current = d.pageHeight;
        setHeatmapData(d);
        setTotalClicks(d.totalClicks);

        if (d.pageWidth > 0 && !cancelled) {
          api
            .get(
              `/api/v1/analytics/heatmap/screenshot?url=${encodeURIComponent(pageUrl)}&applicationId=${encodeURIComponent(appId)}&viewportWidth=${d.pageWidth}`,
              { responseType: 'blob' },
            )
            .then((sres) => {
              if (cancelled) return;
              const url = URL.createObjectURL(sres.data as Blob);
              setScreenshotUrl(url);
            })
            .catch(() => {});
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Request failed');
      });

    return () => {
      cancelled = true;
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
      setHeatmapData(null);
      setError(null);
      setScreenshotUrl(null);
      setImgSize(null);
      heatmapPointsRef.current = [];
      setTotalClicks(0);
    };
  }, [pageUrl, appId]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c || !imgSize || !heatmapData) return;

    const scaleX = imgSize.w / heatmapData.pageWidth;
    const scaleY = imgSize.h / heatmapData.pageHeight;

    const instance = create({
      container: c,
      radius: 25,
      blur: 0.7,
      maxOpacity: 0.8,
      minOpacity: 0.3,
      width: imgSize.w,
      height: imgSize.h,
      gradient: {
        '0.0': 'rgba(56, 189, 248, 0.4)',
        '0.3': '#38bdf8',
        '0.5': '#818cf8',
        '0.7': '#fbbf24',
        '1.0': '#f87171',
      },
    } as HeatmapConfiguration & { width: number; height: number });

    heatmapRef.current = instance;
    imgSizeRef.current = imgSize;

    const max = Math.max(...heatmapData.points.map((p) => p.count), 1);

    const mapped = heatmapData.points.map((p) => ({
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY),
      value: p.count,
    }));

    instance.setData({ max, min: 0, data: mapped });

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
            {t('heatmapTotalClicks')}: {totalClicks}
          </span>
        </div>
      )}
      <div className="relative flex-1 overflow-auto rounded-lg border border-border-subtle bg-bg-card">
        <div
          ref={containerRef}
          className="relative"
          style={
            imgSize ? { width: imgSize.w, height: imgSize.h, minHeight: 200 } : { minHeight: 200 }
          }
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
            <img
              src={screenshotUrl}
              alt={pageUrl ?? ''}
              className="block max-w-none"
              onLoad={(e) => {
                setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
