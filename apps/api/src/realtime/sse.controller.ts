import type { Request, Response } from 'express';
import { verifyRefreshToken } from '../modules/auth/jwt.js';
import { addSubscriber, removeSubscriber, addToRoom, removeFromRoom } from './sse-registry.js';
import { ConversationModel } from '../models/conversation.js';
import { AppError } from '../utils/app-error.js';

export async function sseStream(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw new AppError(401, 'unauthorized', 'No refresh token.');

  let payload: { sub: string; role: 'admin' | 'webmaster'; companyId?: string };
  try {
    payload = verifyRefreshToken(refreshToken);
    if (!payload.companyId) throw new AppError(401, 'unauthorized', 'No company on token.');
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid or expired token.');
  }

  const { companyId, sub: userId, role } = payload;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ companyId })}\n\n`);

  addSubscriber(companyId, res);

  // Room subscriptions for support chat
  const subscribedRooms: string[] = [];

  if (role === 'admin') {
    addToRoom('support:notify', res);
    subscribedRooms.push('support:notify');
  }

  // Subscribe to active conversation rooms
  const conversations = await ConversationModel.find({
    $or: [{ companyId }, { assignedTo: userId }],
    status: { $ne: 'closed' },
  }).lean();

  for (const conv of conversations) {
    const roomId = `conversation:${conv._id}`;
    addToRoom(roomId, res);
    subscribedRooms.push(roomId);
  }

  req.on('close', () => {
    removeSubscriber(companyId, res);
    for (const roomId of subscribedRooms) {
      removeFromRoom(roomId, res);
    }
  });
}