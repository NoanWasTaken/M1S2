import { z } from 'zod';

export const registerSchema = z.object({
    company: z.object({
        name: z.string().min(1, 'Company name is required'),
        baseUrl: z.string().url("Invalid website URL"),
        kbisFileRef: z.string().min(1, 'KBIS document is required'),
        contact: z.object({
            name: z.string().min(1),
            email: z.string().email(),
            phone: z.string().optional(),
        }),
    }),
    user: z.object({
        email: z.string().email("Invalid email"),
        password: z.string().min(8, 'Password must be at least 8 characters long'),
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
    locale: z.enum(['fr', 'en']).optional(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères.'),
});

export const acceptInvitationSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({});

export type RefreshInput = z.infer<typeof refreshSchema>;