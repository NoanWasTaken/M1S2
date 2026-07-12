import { pushToAdmins } from './sse-registry.js';

const onlineUsers = new Map<string, number>();

export function countOnlineUsers(): number {
    return onlineUsers.size;
}

export function countConnections(): number {
    let total = 0;
    for (const count of onlineUsers.values()) total += count;
    return total;
}

function broadcastPresence(): void {
    pushToAdmins('platform:presence', {
        onlineUsers: countOnlineUsers(),
        connections: countConnections(),
    });
}

export function userConnected(userId: string): void {
    onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
    broadcastPresence();
}

export function userDisconnected(userId: string): void {
    const current = onlineUsers.get(userId);
    if (current === undefined) return;

    if (current <= 1) {
        onlineUsers.delete(userId);
    } else {
        onlineUsers.set(userId, current - 1);
    }
    broadcastPresence();
}