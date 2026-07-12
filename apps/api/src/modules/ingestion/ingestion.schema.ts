import { z } from 'zod';

const eventSchema = z.object({
    type: z.string().min(1).max(64),
    url: z.string().max(2048).optional(),
    occurredAt: z.string().datetime().optional(),
    visitorId: z.string().max(128).optional(),
    sessionId: z.string().max(128).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
});

export const ingestBatchSchema = z.object({
    events: z.array(eventSchema).min(1).max(50),
});

export type IngestBatchInput = z.infer<typeof ingestBatchSchema>;