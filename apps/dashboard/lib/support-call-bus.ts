import type { SupportCallSignalEvent } from '@/lib/use-conversation-stream';

export type CallSignalMessage = SupportCallSignalEvent & { callAccepted?: boolean };

type Listener = (signal: CallSignalMessage) => void;

const listeners = new Set<Listener>();

type BufferedCandidate = {
  candidate: RTCIceCandidateInit;
  sessionId?: string;
};

const iceBuffers = new Map<string, BufferedCandidate[]>();

export function publishCallSignal(signal: CallSignalMessage) {
  for (const listener of listeners) {
    try {
      listener(signal);
    } catch (error) {
      console.warn('Call signal listener failed', error);
    }
  }
}

export function subscribeCallSignals(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bufferRemoteIceCandidate(
  conversationId: string,
  candidate: RTCIceCandidateInit,
  sessionId?: string,
) {
  const existing = iceBuffers.get(conversationId) ?? [];
  existing.push({ candidate, sessionId });
  if (existing.length > 64) existing.splice(0, existing.length - 64);
  iceBuffers.set(conversationId, existing);
}

export function drainRemoteIceCandidates(
  conversationId: string,
  sessionId?: string | null,
): RTCIceCandidateInit[] {
  const existing = iceBuffers.get(conversationId) ?? [];
  iceBuffers.delete(conversationId);
  return existing
    .filter((item) => {
      if (!sessionId || !item.sessionId) return true;
      return item.sessionId === sessionId;
    })
    .map((item) => item.candidate);
}

export function clearRemoteIceCandidates(conversationId: string) {
  iceBuffers.delete(conversationId);
}
