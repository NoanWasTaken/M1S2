import { Request, Response } from 'express';
import { AppError } from '../../utils/app-error.js';
import {
  createConversationSchema,
  sendMessageSchema,
  updateStatusSchema,
  assignConversationSchema,
  conversationQuerySchema,
} from './conversations.schema.js';
import {
  listConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
  updateConversationStatus,
  assignConversation,
  getUnreadCount,
  sendTypingIndicator,
} from './conversations.service.js';

function creator(req: Request) {
  return {
    userId: req.user!.sub,
    role: req.user!.role,
    companyId: req.user!.companyId,
  };
}

export async function getConversations(req: Request, res: Response) {
  const query = conversationQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new AppError(400, 'invalid_query', query.error.issues[0]?.message ?? 'Invalid query.');
  }

  const result = await listConversations(creator(req), query.data);
  res.json(result);
}

export async function getConversationById(req: Request, res: Response) {
  const conversation = await getConversation(req.params.id as string, creator(req));
  res.json({ conversation });
}

export async function postConversation(req: Request, res: Response) {
  const result = createConversationSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const conversation = await createConversation(creator(req), result.data);
  res.status(201).json({ conversation });
}

export async function getConversationMessages(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await getMessages(req.params.id as string, creator(req), page, limit);
  res.json(result);
}

export async function postConversationMessage(req: Request, res: Response) {
  const result = sendMessageSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const message = await sendMessage(req.params.id as string, creator(req), result.data);
  res.status(201).json({ message });
}

export async function patchConversationStatus(req: Request, res: Response) {
  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const conversation = await updateConversationStatus(req.params.id as string, creator(req), result.data.status);
  res.json({ conversation });
}

export async function patchConversationAssign(req: Request, res: Response) {
  const result = assignConversationSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid data.');
  }

  const conversation = await assignConversation(req.params.id as string, creator(req), result.data.assignToId);
  res.json({ conversation });
}

export async function getUnreadCountHandler(req: Request, res: Response) {
  const count = await getUnreadCount(creator(req));
  res.json({ count });
}

export async function postTypingIndicator(req: Request, res: Response) {
  const isTyping = req.body?.isTyping === true;
  await sendTypingIndicator(req.params.id as string, creator(req), isTyping);
  res.json({ ok: true });
}
