import { EventModel } from '../../models/event.js';
import type { IngestBatchInput } from './ingestion.schema.js';
import { normalizeUrl } from '../../utils/normalize-url.js';
import { emitDashboardUpdate, emitHeatmapPoint } from '../../realtime/live-stats.js';

export async function ingestBrowserEvents(
  appId: string,
  batch: IngestBatchInput,
  country: string | null = null,
) {
  const now = new Date();
  const documents = batch.events.map((e) => ({
    appId,
    type: e.type,
    url: normalizeUrl(e.url),
    occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
    visitorId: e.visitorId,
    sessionId: e.sessionId,
    source: 'browser' as const,
    country,
    payload: e.payload ?? {},
  }));

  const clickEvents = batch.events.filter((e) => e.type === 'click');
  const clickWithCoords = clickEvents.filter((e) => {
    const payload = e.payload ?? {};
    return payload.px !== undefined && payload.py !== undefined;
  });

  console.info('[ingestion][browser] batch', {
    appId,
    total: batch.events.length,
    clickEvents: clickEvents.length,
    clickWithCoords: clickWithCoords.length,
    sampleUrls: [...new Set(batch.events.map((e) => normalizeUrl(e.url)).filter(Boolean))].slice(
      0,
      10,
    ),
  });

  await EventModel.insertMany(documents);

  void emitDashboardUpdate(appId);

  for (const click of clickWithCoords) {
    void emitHeatmapPoint(appId, { url: normalizeUrl(click.url), payload: click.payload ?? {} });
  }

  return { received: documents.length };
}

export async function ingestServerEvents(appId: string, batch: IngestBatchInput) {
  const now = new Date();
  const documents = batch.events.map((e) => ({
    appId,
    type: e.type,
    url: e.url ? normalizeUrl(e.url) : undefined,
    occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
    visitorId: e.visitorId,
    sessionId: e.sessionId,
    source: 'server' as const,
    payload: e.payload ?? {},
  }));
  await EventModel.insertMany(documents);

  void emitDashboardUpdate(appId);

  return { received: documents.length };
}
