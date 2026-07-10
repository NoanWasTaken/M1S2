import type { Request, Response } from 'express';
import { verifyRefreshToken } from '../modules/auth/jwt.js';
import { addSubscriber, removeSubscriber } from './sse-registry.js';
import { AppError } from '../utils/app-error.js';

export async function sseStream(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw new AppError(401, 'unauthorized', 'No refresh token.');

  let companyId: string;
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload.companyId) throw new AppError(401, 'unauthorized', 'No company on token.');
    companyId = payload.companyId;
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid or expired token.');
  }


  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ companyId })}\n\n`);

  addSubscriber(companyId, res);

  req.on('close', () => {
    removeSubscriber(companyId, res);
  });
}