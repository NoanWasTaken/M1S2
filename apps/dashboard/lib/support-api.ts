import { api } from './api-client';

export type ConversationStatus = 'waiting' | 'open' | 'closed';
export type SenderRole = 'webmaster' | 'admin';

export interface Conversation {
  _id: string;
  companyId: string;
  userId: string;
  requesterEmail?: string | null;
  subject: string;
  kind?: 'support' | 'internal';
  status: ConversationStatus;
  assignedTo: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: SenderRole;
  content: string;
  type: 'text' | 'system';
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchConversations(status?: ConversationStatus, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  const res = await api.get<{ conversations: Conversation[]; total: number; page: number; limit: number }>(
    `/api/v1/conversations?${params}`,
  );
  return res.data;
}

export async function fetchConversation(id: string) {
  const res = await api.get<{ conversation: Conversation }>(`/api/v1/conversations/${id}`);
  return res.data.conversation;
}

export async function fetchMessages(conversationId: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await api.get<{ messages: Message[]; total: number; page: number; limit: number }>(
    `/api/v1/conversations/${conversationId}/messages?${params}`,
  );
  return res.data;
}

export async function createConversation(subject: string, initialMessage: string) {
  const res = await api.post<{ conversation: Conversation }>('/api/v1/conversations', { subject, initialMessage });
  return res.data.conversation;
}

export async function createInternalConversation(subject: string, initialMessage: string) {
  const res = await api.post<{ conversation: Conversation }>(
    '/api/v1/conversations/internal',
    { subject, initialMessage },
  );
  return res.data.conversation;
}

export async function sendMessage(conversationId: string, content: string, type: Message['type'] = 'text') {
  const res = await api.post<{ message: Message }>(
    `/api/v1/conversations/${conversationId}/messages`,
    { content, type },
  );
  return res.data.message;
}

export async function acceptConversation(conversationId: string) {
  const res = await api.patch<{ conversation: Conversation }>(
    `/api/v1/conversations/${conversationId}/status`,
    { status: 'open' },
  );
  return res.data.conversation;
}

export async function closeConversation(conversationId: string) {
  const res = await api.patch<{ conversation: Conversation }>(
    `/api/v1/conversations/${conversationId}/status`,
    { status: 'closed' },
  );
  return res.data.conversation;
}

export async function assignConversation(conversationId: string, assignToId: string) {
  const res = await api.patch<{ conversation: Conversation }>(
    `/api/v1/conversations/${conversationId}/assign`,
    { assignToId },
  );
  return res.data.conversation;
}

export async function getUnreadCount() {
  const res = await api.get<{ count: number }>('/api/v1/conversations/unread-count');
  return res.data.count;
}

export async function sendTyping(conversationId: string, isTyping: boolean) {
  await api.post(`/api/v1/conversations/${conversationId}/typing`, { isTyping });
}

export async function sendCallSignal(
  conversationId: string,
  type: 'offer' | 'answer' | 'candidate' | 'state',
  payload: unknown,
  sessionId?: string,
) {
  await api.post(`/api/v1/conversations/${conversationId}/call/signal`, { type, payload, sessionId });
}
