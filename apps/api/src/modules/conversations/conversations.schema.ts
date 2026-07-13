import { z } from 'zod';

export const createConversationSchema = z.object({
  subject: z.string().min(1).max(200),
  initialMessage: z.string().min(1).max(5000),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(['text', 'system']).default('text'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
});

export const assignConversationSchema = z.object({
  assignToId: z.string().min(1),
});

export const conversationQuerySchema = z.object({
  status: z.enum(['waiting', 'open', 'closed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const callSignalSchema = z.object({
  type: z.enum(['offer', 'answer', 'candidate', 'state']),
  payload: z.unknown(),
  sessionId: z.string().min(1).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;
export type ConversationQueryInput = z.infer<typeof conversationQuerySchema>;
