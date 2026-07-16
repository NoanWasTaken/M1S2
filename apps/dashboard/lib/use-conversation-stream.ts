'use client';

import { useEffect, useRef } from 'react';
import { refreshAccessToken } from './api-client';

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/realtime/stream`;

export type SupportMessageEvent = {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: 'webmaster' | 'admin';
  content: string;
  sentAt: string;
};

export type SupportPresenceEvent = {
  conversationId: string;
  status: string;
  userId?: string;
  assignedTo?: string;
};

export type SupportTypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

export type SupportNewConversationEvent = {
  conversationId: string;
  subject: string;
};

export type SupportCallSignalEvent = {
  conversationId: string;
  senderId: string;
  senderRole: 'webmaster' | 'admin';
  type: 'offer' | 'answer' | 'candidate' | 'state';
  payload: unknown;
  sessionId?: string;
};

type UseConversationStreamOptions = {
  onMessage?: (payload: SupportMessageEvent) => void;
  onPresence?: (payload: SupportPresenceEvent) => void;
  onTyping?: (payload: SupportTypingEvent) => void;
  onNewConversation?: (payload: SupportNewConversationEvent) => void;
  onCallSignal?: (payload: SupportCallSignalEvent) => void;
};

function attachHandlers(es: EventSource, handlersRef: React.MutableRefObject<UseConversationStreamOptions>) {
  es.addEventListener('support:message', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SupportMessageEvent;
      handlersRef.current.onMessage?.(payload);
    } catch {
      console.error('[SSE] Failed to parse support:message', e.data);
    }
  });

  es.addEventListener('support:presence', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SupportPresenceEvent;
      handlersRef.current.onPresence?.(payload);
    } catch {
      console.error('[SSE] Failed to parse support:presence', e.data);
    }
  });

  es.addEventListener('support:typing', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SupportTypingEvent;
      handlersRef.current.onTyping?.(payload);
    } catch {
      console.error('[SSE] Failed to parse support:typing', e.data);
    }
  });

  es.addEventListener('support:new-conversation', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SupportNewConversationEvent;
      handlersRef.current.onNewConversation?.(payload);
    } catch {
      console.error('[SSE] Failed to parse support:new-conversation', e.data);
    }
  });

  es.addEventListener('support:call-signal', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SupportCallSignalEvent;
      handlersRef.current.onCallSignal?.(payload);
    } catch {
      console.error('[SSE] Failed to parse support:call-signal', e.data);
    }
  });
}

export function useConversationStream(options: UseConversationStreamOptions = {}, reconnectKey?: string) {
  const handlersRef = useRef(options);

  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    function connect() {
      if (cancelled) return;

      es?.close();
      es = new EventSource(SSE_URL, { withCredentials: true });

      attachHandlers(es, handlersRef);
    }

    connect();

    const refreshInterval = setInterval(async () => {
      if (cancelled) return;
      try {
        await refreshAccessToken();
      } catch {
        return;
      }
      connect();
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      es?.close();
    };
  }, [reconnectKey]);
}
