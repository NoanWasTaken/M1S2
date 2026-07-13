import { ConversationModel } from '../../models/conversation.js';
import { MessageModel } from '../../models/message.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import {
  sendNewConversationEmail,
  sendConversationAcceptedEmail,
  sendInternalRequestEmail,
} from '../../utils/email.js';
import { pushToAccount, pushToRoom } from '../../realtime/sse-registry.js';

type Creator = {
  userId: string;
  role: 'admin' | 'webmaster';
  companyId?: string;
  teamRole?: 'owner' | 'member' | null;
};

function isMember(user: Creator): boolean {
  return user.role === 'webmaster' && user.teamRole === 'member';
}

function withRequesterEmail<T extends { userId: unknown }>(conversation: T) {
  const populated = conversation.userId as unknown as { _id?: unknown; email?: string } | null;
  return {
    ...conversation,
    userId: populated?._id ?? conversation.userId,
    requesterEmail: populated?.email ?? null,
  };
}

export async function listConversations(user: Creator, query: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};

  if (user.role === 'webmaster') {
    filter.companyId = user.companyId;

    // Member: own internal only
    if (isMember(user)) {
      filter.kind = 'internal';
      filter.userId = user.userId;
    }
  }

  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [conversations, total] = await Promise.all([
    ConversationModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('userId', 'email')
      .lean(),
    ConversationModel.countDocuments(filter),
  ]);

  return {
    conversations: conversations.map(withRequesterEmail),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getConversation(conversationId: string, user: Creator) {
  const conversation = await ConversationModel.findById(conversationId).lean();
  if (!conversation) throw new AppError(404, 'conversation_not_found', 'Conversation not found.');

  if (user.role === 'webmaster' && conversation.companyId.toString() !== user.companyId) {
    throw new AppError(403, 'forbidden', 'This conversation does not belong to your company.');
  }

  if (
    isMember(user) &&
    (conversation.kind !== 'internal' || conversation.userId.toString() !== user.userId)
  ) {
    throw new AppError(403, 'forbidden', 'You can only access your own internal requests.');
  }

  return conversation;
}

export async function createConversation(user: Creator, data: { subject: string; initialMessage: string }) {
  const conversation = await ConversationModel.create({
    companyId: user.companyId,
    userId: user.userId,
    subject: data.subject,
    kind: 'support',
  });

  await MessageModel.create({
    conversationId: conversation._id,
    senderId: user.userId,
    senderRole: 'webmaster',
    content: data.initialMessage,
  });

  pushToRoom('support:notify', 'support:new-conversation', {
    conversationId: conversation._id,
    subject: data.subject,
  });

  const admins = await UserModel.find({ role: 'admin' }).lean();
  for (const admin of admins) {
    await sendNewConversationEmail(admin.email, conversation._id.toString(), data.subject);
  }

  return conversation;
}

export async function createInternalConversation(
  user: Creator,
  data: { subject: string; initialMessage: string },
) {
  if (!user.companyId) {
    throw new AppError(400, 'company_required', 'No company associated.');
  }

  const conversation = await ConversationModel.create({
    companyId: user.companyId,
    userId: user.userId,
    subject: data.subject,
    kind: 'internal',
  });

  await MessageModel.create({
    conversationId: conversation._id,
    senderId: user.userId,
    senderRole: 'webmaster',
    content: data.initialMessage,
  });

  pushToAccount(user.companyId, 'support:new-conversation', {
    conversationId: conversation._id,
    subject: data.subject,
    kind: 'internal',
  });

  const owner = await UserModel.findOne({ companyId: user.companyId, teamRole: 'owner' }).lean();
  if (owner) {
    await sendInternalRequestEmail(owner.email, conversation._id.toString(), data.subject);
  }

  return conversation;
}

export async function getMessages(
  conversationId: string,
  user: Creator,
  page: number,
  limit: number,
) {
  await getConversation(conversationId, user);

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    MessageModel.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MessageModel.countDocuments({ conversationId }),
  ]);

  return { messages, total, page, limit };
}

export async function sendMessage(
  conversationId: string,
  user: Creator,
  data: { content: string; type?: 'text' | 'system' },
) {
  await getConversation(conversationId, user);

  const message = await MessageModel.create({
    conversationId,
    senderId: user.userId,
    senderRole: user.role,
    content: data.content,
    type: data.type ?? 'text',
  });

  pushToRoom(`conversation:${conversationId}`, 'support:message', {
    messageId: message._id,
    conversationId,
    senderId: user.userId,
    senderRole: user.role,
    content: data.content,
    sentAt: message.createdAt,
  });

  return message;
}

export async function updateConversationStatus(
  conversationId: string,
  user: Creator,
  status: 'open' | 'closed',
) {
  const conversation = await getConversation(conversationId, user);

  if (status === 'open' && conversation.status !== 'waiting') {
    throw new AppError(400, 'invalid_status', 'Only waiting conversations can be opened.');
  }
  if (status === 'closed' && conversation.status === 'closed') {
    throw new AppError(400, 'invalid_status', 'Conversation is already closed.');
  }

  const update: Record<string, unknown> = { status };
  if (status === 'open') {
    update.openedAt = new Date();
    update.assignedTo = user.userId;
  }
  if (status === 'closed') {
    update.closedAt = new Date();
  }

  const updated = await ConversationModel.findByIdAndUpdate(conversationId, update, { new: true }).lean();

  pushToRoom(`conversation:${conversationId}`, 'support:presence', {
    conversationId,
    status,
    userId: user.userId,
  });

  if (status === 'open') {
    const creator = await UserModel.findById(conversation.userId).lean();
    if (creator) {
      await sendConversationAcceptedEmail(creator.email, conversationId);
    }
  }

  return updated;
}

export async function assignConversation(
  conversationId: string,
  user: Creator,
  assignToId: string,
) {
  if (user.role !== 'admin') {
    throw new AppError(403, 'forbidden', 'Only admins can assign conversations.');
  }

  const conversation = await ConversationModel.findById(conversationId).lean();
  if (!conversation) throw new AppError(404, 'conversation_not_found', 'Conversation not found.');

  const updated = await ConversationModel.findByIdAndUpdate(
    conversationId,
    { assignedTo: assignToId },
    { new: true },
  ).lean();

  pushToRoom(`conversation:${conversationId}`, 'support:presence', {
    conversationId,
    status: conversation.status,
    assignedTo: assignToId,
  });

  return updated;
}

export async function getUnreadCount(user: Creator) {
  const filter: Record<string, unknown> = {};

  if (user.role === 'webmaster') {
    filter.companyId = user.companyId;

    if (isMember(user)) {
      filter.kind = 'internal';
      filter.userId = user.userId;
    }
  }

  if (user.role === 'admin') {
    filter.status = 'waiting';
  }

  return ConversationModel.countDocuments(filter);
}

export async function sendTypingIndicator(
  conversationId: string,
  user: Creator,
  isTyping: boolean,
) {
  await getConversation(conversationId, user);

  pushToRoom(`conversation:${conversationId}`, 'support:typing', {
    conversationId,
    userId: user.userId,
    isTyping,
  });
}

export async function sendCallSignal(
  conversationId: string,
  user: Creator,
  data: { type: 'offer' | 'answer' | 'candidate' | 'state'; payload: unknown; sessionId?: string },
) {
  await getConversation(conversationId, user);

  pushToRoom(`conversation:${conversationId}`, 'support:call-signal', {
    conversationId,
    senderId: user.userId,
    senderRole: user.role,
    type: data.type,
    payload: data.payload,
    sessionId: data.sessionId,
  });
}