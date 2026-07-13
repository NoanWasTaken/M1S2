import type { Response } from 'express';

const registry = new Map<string, Set<Response>>();
const rooms = new Map<string, Set<Response>>();

export const ADMIN_ROOM = 'admins';

export function addSubscriber(accountId: string, res: Response): void {
  if (!registry.has(accountId)) registry.set(accountId, new Set());
  registry.get(accountId)!.add(res);
}

export function removeSubscriber(accountId: string, res: Response): void {
  registry.get(accountId)?.delete(res);
  if (registry.get(accountId)?.size === 0) registry.delete(accountId);
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
    try {
      res.write(payload);
    } catch {
      removeFromRoom(roomId, res);
    }
  }
}

export function pushToAccount(accountId: string, event: string, data: unknown): void {
  const subscribers = registry.get(accountId);
  if (!subscribers || subscribers.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      removeSubscriber(accountId, res);
    }
  }
}

export function getRoomSize(roomId: string): number {
  return rooms.get(roomId)?.size ?? 0;
}

export function startHeartbeat(): void {
  setInterval(() => {
    for (const [, subscribers] of registry) {
      for (const res of subscribers) {
        try {
          res.write(':\n\n');
        } catch {
        }
      }
    }
  }, 15_000);
}

export function pushToAdmins(event: string, data: unknown): void {
  pushToRoom(ADMIN_ROOM, event, data);
}