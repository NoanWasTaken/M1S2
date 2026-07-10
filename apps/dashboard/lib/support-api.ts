import { api } from './api-client';

export type ConversationStatus = 'waiting' | 'open' | 'closed';
export type SenderRole = 'visitor' | 'agent';
export type MessageType = 'text' | 'system';

export interface ConversationMetadata {
  originUrl?: string;
  userAgent?: string;
  visitorName?: string;
}

export interface Conversation {
  _id: string;
  appId: string;
  applicationId: string;
  companyId: string;
  visitorId: string;
  agentId: string | null;
  status: ConversationStatus;
  metadata: ConversationMetadata;
  acceptedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  appId: string;
  senderRole: SenderRole;
  senderId: string | null;
  type: MessageType;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export async function fetchConversations(
  status?: ConversationStatus,
): Promise<Conversation[]> {
  const params = status ? `?status=${status}` : '';
  const res = await api.get<{ conversations: Conversation[] }>(
    `/api/v1/conversations${params}`,
  );
  return res.data.conversations;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await api.get<{ messages: Message[] }>(
    `/api/v1/conversations/${conversationId}/messages`,
  );
  return res.data.messages;
}


export async function acceptConversation(
  conversationId: string,
): Promise<Conversation> {
  const res = await api.patch<{ conversation: Conversation }>(
    `/api/v1/conversations/${conversationId}/status`,
    { status: 'open' },
  );
  return res.data.conversation;
}

export async function closeConversation(
  conversationId: string,
): Promise<Conversation> {
  const res = await api.patch<{ conversation: Conversation }>(
    `/api/v1/conversations/${conversationId}/status`,
    { status: 'closed' },
  );
  return res.data.conversation;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  const res = await api.post<{ message: Message }>(
    `/api/v1/conversations/${conversationId}/messages`,
    { content },
  );
  return res.data.message;
}
