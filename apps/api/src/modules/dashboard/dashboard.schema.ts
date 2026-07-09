import { z } from 'zod';

export const overviewQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).default('24h'),
});

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
