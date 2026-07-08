import { z } from 'zod';

export const registerSchema = z.object({
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    baseUrl: z.string().url('Invalid website URL'),
    kbisFileRef: z.string().min(1, 'KBIS document is required'),
    contact: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
    }),
  }),
  user: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type User = {
  sub: string;
  email: string;
  role: 'admin' | 'webmaster';
  companyId?: string;
  teamRole?: 'owner' | 'member' | null;
};
