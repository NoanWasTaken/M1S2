import type { SupportCallSignalEvent } from '@/lib/use-conversation-stream';

const INTENT_KEY = 'support:call-accept-intent';
const PENDING_KEY = 'support:pending-call';
const ACCEPT_TTL_MS = 2 * 60 * 1000;

export type AcceptedCallSignal = SupportCallSignalEvent & { callAccepted: true };

type CallAcceptIntent = {
  conversationId: string;
  sessionId?: string;
  acceptedAt: number;
};

let memoryOffer: AcceptedCallSignal | null = null;

function readIntent(): CallAcceptIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CallAcceptIntent;
    if (!parsed?.conversationId || typeof parsed.acceptedAt !== 'number') return null;
    if (Date.now() - parsed.acceptedAt > ACCEPT_TTL_MS) {
      clearCallAcceptIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readStoredOffer(): AcceptedCallSignal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcceptedCallSignal;
    if (parsed?.type !== 'offer' || !parsed.callAccepted) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCallAcceptIntent() {
  memoryOffer = null;
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(INTENT_KEY);
  window.sessionStorage.removeItem(PENDING_KEY);
  window.sessionStorage.removeItem('support:accepted-call-id');
}

export function setCallAcceptIntent(call: SupportCallSignalEvent) {
  if (typeof window === 'undefined') return;

  const accepted: AcceptedCallSignal = { ...call, callAccepted: true };
  const intent: CallAcceptIntent = {
    conversationId: call.conversationId,
    sessionId: typeof call.sessionId === 'string' ? call.sessionId : undefined,
    acceptedAt: Date.now(),
  };

  window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(accepted));

  if (call.type === 'offer') {
    memoryOffer = accepted;
  }
}

export function hasCallAcceptIntent(conversationId: string): boolean {
  if (memoryOffer?.conversationId === conversationId) return true;
  const intent = readIntent();
  return intent?.conversationId === conversationId;
}

export function peekAcceptedOffer(conversationId: string): AcceptedCallSignal | null {
  if (memoryOffer?.conversationId === conversationId && memoryOffer.type === 'offer') {
    return memoryOffer;
  }

  const intent = readIntent();
  if (!intent || intent.conversationId !== conversationId) return null;

  const stored = readStoredOffer();
  if (!stored || stored.conversationId !== conversationId) return null;

  memoryOffer = stored;
  return stored;
}

export function consumeAcceptedOffer(payload: SupportCallSignalEvent): AcceptedCallSignal | null {
  if (payload.type !== 'offer') return null;

  const intent = readIntent();
  const memoryMatch = memoryOffer?.conversationId === payload.conversationId;
  if (!intent && !memoryMatch) return null;

  if (intent && intent.conversationId !== payload.conversationId) return null;
  if (intent?.sessionId && payload.sessionId && intent.sessionId !== payload.sessionId) {
    return null;
  }

  const accepted: AcceptedCallSignal = { ...payload, callAccepted: true };
  memoryOffer = accepted;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(accepted));
  }
  return accepted;
}

export function asAcceptedCall(payload: SupportCallSignalEvent): AcceptedCallSignal {
  const accepted: AcceptedCallSignal = { ...payload, callAccepted: true };
  if (payload.type === 'offer') {
    memoryOffer = accepted;
  }
  return accepted;
}
