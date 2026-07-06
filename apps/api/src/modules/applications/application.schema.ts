// Application schema for the API

import { z } from 'zod';

export const createApplicationSchema = z.object({
    name: z.string().min(1, "The application name is required"),
    // Optional: required only when creating an application as an admin
    companyId: z.string().optional(),
});

export const updateOriginsSchema = z.object({
    allowedOrigins: z
        .array(z.string().url("Each origin must be a valid URL (ex. https://mysite.fr)"))
        .max(20, 'Maximum 20 allowed origins'),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateOriginsInput = z.infer<typeof updateOriginsSchema>;
