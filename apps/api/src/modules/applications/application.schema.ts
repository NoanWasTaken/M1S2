// Application schema for the API

import { z } from 'zod';

export const createApplicationSchema = z.object({
    name: z.string().min(1, "The application name is required"),
    // Optional: required only when creating an application as an admin
    companyId: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

