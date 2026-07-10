import type { Response } from 'express';

const registry = new Map<string, Set<Response>>();
const rooms = new Map<string, Set<Response>>();

export function addSubscriber(accountId: string, res: Response): void {
  if (!registry.has(accountId)) registry.set(accountId, new Set());
  registry.get(accountId)!.add(res);
  console.log(`[SSE] +1 subscriber for account ${accountId} (total: ${registry.get(accountId)!.size})`);
}

export function removeSubscriber(accountId: string, res: Response): void {
  registry.get(accountId)?.delete(res);
  if (registry.get(accountId)?.size === 0) registry.delete(accountId);
  console.log(`[SSE] -1 subscriber for account ${accountId}`);
}

export function pushToAccount(accountId: string, event: string, data: unknown): void {
  const subscribers = registry.get(accountId);
  if (!subscribers || subscribers.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    res.write(payload);
  }
}

export function addToRoom(roomId: string, res: Response): void {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId)!.add(res);
}

export function removeFromRoom(roomId: string, res: Response): void {
  rooms.get(roomId)?.delete(res);
  if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
}

export function pushToRoom(roomId: string, event: string, data: unknown): void {
  const subscribers = rooms.get(roomId);
  if (!subscribers || subscribers.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    res.write(payload);
  }
}

export function getRoomSize(roomId: string): number {
  return rooms.get(roomId)?.size ?? 0;
}

export function startHeartbeat(): void {
  setInterval(() => {
    for (const [, subscribers] of registry) {
      for (const res of subscribers) {
        res.write(':\n\n'); 
      }
    }
  }, 15_000);
  console.log('[SSE] Heartbeat started (15s interval)');
}