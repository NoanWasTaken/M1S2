import type { Request, Response } from 'express';
import { verifyAccessToken, verifyRefreshToken } from '../modules/auth/jwt.js';
import { addSubscriber, removeSubscriber, addToRoom, removeFromRoom, ADMIN_ROOM } from './sse-registry.js';
import { ConversationModel } from '../models/conversation.js';
import { userConnected, userDisconnected } from './presence.js';

export async function sseStream(req: Request, res: Response): Promise<void> {
  try {
    const token = (req.cookies?.refreshToken || req.query.token) as string | undefined;
    if (!token) {
      res.status(401).end();
      return;
    }

    let payload: { sub: string; role: 'admin' | 'webmaster'; companyId?: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      try {
        payload = verifyAccessToken(token);
      } catch {
        res.status(401).end();
        return;
      }
    }

    const { companyId, sub: userId, role } = payload;

    // Admin: no companyId
    if (!companyId && role !== 'admin') {
      res.status(401).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const registryKey = companyId || `admin:${userId}`;
    res.write(`event: connected\ndata: ${JSON.stringify({ companyId: companyId || null })}\n\n`);

    addSubscriber(registryKey, res);
    userConnected(userId);

    const subscribedRooms: string[] = [];

    if (role === 'admin') {
      addToRoom('support:notify', res);
      subscribedRooms.push('support:notify');

      addToRoom(ADMIN_ROOM, res);
      subscribedRooms.push(ADMIN_ROOM);
    }

    // Admin: all conversations
    const conversationFilter: Record<string, unknown> = { status: { $ne: 'closed' } };
    if (role === 'webmaster') {
      conversationFilter.companyId = companyId;
    }
    const conversations = await ConversationModel.find(conversationFilter).lean();

    for (const conv of conversations) {
      const roomId = `conversation:${conv._id}`;
      addToRoom(roomId, res);
      subscribedRooms.push(roomId);
    }

    req.on('close', () => {
      userDisconnected(userId);
      removeSubscriber(registryKey, res);
      for (const roomId of subscribedRooms) {
        removeFromRoom(roomId, res);
      }
    });
  } catch {
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
}
