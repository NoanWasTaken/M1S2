import { z } from 'zod';

export const filterSchema = z.object({
    field: z.enum(['type', 'url', 'payload.nature', 'payload.device', 'payload.referrerType']),
    value: z.string().min(1),
});

export const analyticsQuerySchema = z.object({
    applicationId: z.string().min(1),
    metric: z.enum(['event_count', 'unique_sessions', 'unique_visitors']),
    filters: z.array(filterSchema).default([]),
    period: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }),
    step: z.enum(['hour', 'day', 'week', 'month']).optional(),
    mode: z.enum(['count', 'rate']).default('count'),
});

export const heatmapQuerySchema = z.object({
    url: z.string().min(1).max(2048),
    start: z.string().datetime(),
    end: z.string().datetime(),
    applicationId: z.string().min(1),
});

export const screenshotQuerySchema = z.object({
    url: z.string().min(1).max(2048),
    applicationId: z.string().min(1),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type FilterInput = z.infer<typeof filterSchema>;