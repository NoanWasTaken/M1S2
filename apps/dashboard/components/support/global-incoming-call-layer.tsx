'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { sendCallSignal } from '@/lib/support-api';
import {
  clearCallAcceptIntent,
  hasCallAcceptIntent,
  setCallAcceptIntent,
} from '@/lib/support-call-accept';
import {
  bufferRemoteIceCandidate,
  publishCallSignal,
} from '@/lib/support-call-bus';
import { useConversationStream, type SupportCallSignalEvent } from '@/lib/use-conversation-stream';
import { IncomingCallPopup } from '@/components/support/incoming-call-popup';

function isRingingState(payload: SupportCallSignalEvent): boolean {
  return payload.type === 'state'
    && typeof payload.payload === 'object'
    && payload.payload !== null
    && 'state' in payload.payload
    && payload.payload.state === 'ringing';
}

function isEndedState(payload: SupportCallSignalEvent): boolean {
  return payload.type === 'state'
    && typeof payload.payload === 'object'
    && payload.payload !== null
    && 'state' in payload.payload
    && payload.payload.state === 'ended';
}

export function GlobalIncomingCallLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [pendingCalls, setPendingCalls] = useState<Record<string, SupportCallSignalEvent>>({});

  const pendingCall = useMemo(() => Object.values(pendingCalls)[0] ?? null, [pendingCalls]);

  const handleCallSignal = useCallback((payload: SupportCallSignalEvent) => {
    if (isEndedState(payload)) {
      setPendingCalls((prev) => {
        const next = { ...prev };
        delete next[payload.conversationId];
        return next;
      });
      clearCallAcceptIntent();
      publishCallSignal(payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('support:call-ended', { detail: payload }));
      }
      return;
    }

    if (!user?.id || payload.senderId === user.id) return;

    if (payload.type === 'candidate' && payload.payload && typeof payload.payload === 'object') {
      bufferRemoteIceCandidate(
        payload.conversationId,
        payload.payload as RTCIceCandidateInit,
        payload.sessionId,
      );
      publishCallSignal(payload);
      return;
    }

    if (payload.type === 'offer' || isRingingState(payload)) {
      setPendingCalls((prev) => {
        const existing = prev[payload.conversationId];
        if (existing?.type === 'offer' && payload.type !== 'offer') {
          return prev;
        }
        return { ...prev, [payload.conversationId]: payload };
      });

      if (payload.type === 'offer' && hasCallAcceptIntent(payload.conversationId)) {
        setCallAcceptIntent(payload);
        publishCallSignal({ ...payload, callAccepted: true });
        window.dispatchEvent(new CustomEvent('support:call-accepted', {
          detail: { ...payload, callAccepted: true },
        }));
      }
      return;
    }

    publishCallSignal(payload);
  }, [user?.id]);

  useConversationStream({ onCallSignal: handleCallSignal });

  const answer = () => {
    if (!pendingCall) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('conversation', pendingCall.conversationId);
    const targetPath = pathname.startsWith('/admin') ? '/admin/support' : '/support';

    setCallAcceptIntent(pendingCall);
    if (pendingCall.type === 'offer') {
      publishCallSignal({ ...pendingCall, callAccepted: true });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('support:call-accepted', {
        detail: { ...pendingCall, callAccepted: true },
      }));
    }

    void sendCallSignal(
      pendingCall.conversationId,
      'state',
      { state: 'answered' },
      pendingCall.sessionId,
    );

    setPendingCalls((prev) => {
      const next = { ...prev };
      delete next[pendingCall.conversationId];
      return next;
    });

    router.push(`${targetPath}?${params.toString()}`);
  };

  const decline = () => {
    if (!pendingCall) return;
    clearCallAcceptIntent();
    void sendCallSignal(
      pendingCall.conversationId,
      'state',
      { state: 'ended' },
      pendingCall.sessionId,
    );
    setPendingCalls((prev) => {
      const next = { ...prev };
      delete next[pendingCall.conversationId];
      return next;
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('support:call-ended', {
        detail: {
          ...pendingCall,
          type: 'state',
          payload: { state: 'ended' },
        },
      }));
    }
  };

  return (
    <IncomingCallPopup
      open={Boolean(pendingCall)}
      call={pendingCall}
      onAnswer={answer}
      onDecline={decline}
    />
  );
}
