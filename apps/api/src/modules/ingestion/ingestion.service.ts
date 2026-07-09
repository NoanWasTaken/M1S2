import { EventModel } from '../../models/event.js';
import type { IngestBatchInput } from './ingestion.schema.js';
import { normalizeUrl } from '../../utils/normalize-url.js';


export async function ingestBrowserEvents(appId: string, batch: IngestBatchInput) {
    const now = new Date();

    // Transform each received event into a document
    const documents = batch.events.map((e) => ({
        appId,
        type: e.type,
        url: normalizeUrl(e.url),
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
        visitorId: e.visitorId,
        sessionId: e.sessionId,
        source: 'browser' as const,
        payload: e.payload ?? {},
    }));

    // Insert grouped documents
    await EventModel.insertMany(documents);

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

    return { received: documents.length };
}