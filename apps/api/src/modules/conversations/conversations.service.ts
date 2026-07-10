import { ConversationModel } from '../../models/conversation.js';
import { MessageModel } from '../../models/message.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import { sendNewConversationEmail, sendConversationAcceptedEmail } from '../../utils/email.js';
import { pushToRoom } from '../../realtime/sse-registry.js';

type Creator = {
  userId: string;
  role: 'admin' | 'webmaster';
  companyId?: string;
};

export async function listConversations(user: Creator, query: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};

  if (user.role === 'webmaster') {
    filter.companyId = user.companyId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [conversations, total] = await Promise.all([
    ConversationModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit).lean(),
    ConversationModel.countDocuments(filter),
  ]);

  return { conversations, total, page: query.page, limit: query.limit };
}

export async function getConversation(conversationId: string, user: Creator) {
  const conversation = await ConversationModel.findById(conversationId).lean();
  if (!conversation) throw new AppError(404, 'conversation_not_found', 'Conversation not found.');

  if (user.role === 'webmaster' && conversation.companyId.toString() !== user.companyId) {
    throw new AppError(403, 'forbidden', 'This conversation does not belong to your company.');
  }

  return conversation;
}

export async function createConversation(user: Creator, data: { subject: string; initialMessage: string }) {
  const conversation = await ConversationModel.create({
    companyId: user.companyId,
    userId: user.userId,
    subject: data.subject,
  });

  await MessageModel.create({
    conversationId: conversation._id,
    senderId: user.userId,
    senderRole: 'webmaster',
    content: data.initialMessage,
  });

  // Notify admins via SSE (requires #28 for room subscription wiring)
  pushToRoom('support:notify', 'support:new-conversation', {
    conversationId: conversation._id,
    subject: data.subject,
  });

  // Notify admins via email
  const admins = await UserModel.find({ role: 'admin' }).lean();
  for (const admin of admins) {
    await sendNewConversationEmail(admin.email, conversation._id.toString(), data.subject);
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

  // Push to conversation room via SSE (requires #28 for room subscription wiring)
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

  // Push status change to room (requires #28 for room subscription wiring)
  pushToRoom(`conversation:${conversationId}`, 'support:presence', {
    conversationId,
    status,
    userId: user.userId,
  });

  // If accepted, email the creator
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
    filter.userId = user.userId;
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
