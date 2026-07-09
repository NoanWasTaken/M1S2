const VISITOR_KEY = 'm1s2_visitor_id';
const SESSION_KEY = 'm1s2_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { /* empty */ return null; }
}
function safeSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* empty */ }
}

export function getVisitorId(): string {
    let id = safeGet(VISITOR_KEY);
    if (!id) { id = generateId(); safeSet(VISITOR_KEY, id); }
    return id;
}

export function getSessionId(): string {
    const now = Date.now();
    const raw = safeGet(SESSION_KEY);
    if (raw) {
        try {
            const s = JSON.parse(raw) as { id: string; lastActivity: number };
            if (now - s.lastActivity < SESSION_TIMEOUT_MS) {
                safeSet(SESSION_KEY, JSON.stringify({ id: s.id, lastActivity: now }));
                return s.id;
            }
        } catch { /* empty */ }
    }
    const id = generateId();
    safeSet(SESSION_KEY, JSON.stringify({ id, lastActivity: now }));
    return id;
}