'use client';

import { useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

type UseConversationStreamOptions = {
  onMessage?: (payload: SupportMessageEvent) => void;
  onPresence?: (payload: SupportPresenceEvent) => void;
  onTyping?: (payload: SupportTypingEvent) => void;
  onNewConversation?: (payload: SupportNewConversationEvent) => void;
};

export function useConversationStream(options: UseConversationStreamOptions = {}) {
  const handlersRef = useRef(options);

  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/v1/realtime/stream`, {
      withCredentials: true,
    });

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

    return () => {
      es.close();
    };
  }, []);
}
