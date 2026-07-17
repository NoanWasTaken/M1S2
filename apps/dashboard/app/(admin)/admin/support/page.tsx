'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { SupportBadge } from '@/components/support/support-badge';
import { useSupportNotifications } from '@/components/support/support-notifications';
import { fetchConversations, fetchConversation, fetchMessages, acceptConversation, closeConversation, sendCallSignal, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportCallSignalEvent, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';
import { useAuth } from '@/providers/auth-provider';
import {
  asAcceptedCall,
  clearCallAcceptIntent,
  consumeAcceptedOffer,
  peekAcceptedOffer,
} from '@/lib/support-call-accept';
import { publishCallSignal } from '@/lib/support-call-bus';

function isEndedSignal(payload: SupportCallSignalEvent): boolean {
  return payload.type === 'state'
    && typeof payload.payload === 'object'
    && payload.payload !== null
    && 'state' in payload.payload
    && payload.payload.state === 'ended';
}

function isIncomingCallSignal(payload: SupportCallSignalEvent): boolean {
  const isRinging = payload.type === 'state'
    && typeof payload.payload === 'object'
    && payload.payload !== null
    && 'state' in payload.payload
    && payload.payload.state === 'ringing';
  return payload.type === 'offer' || isRinging;
}

export default function AdminSupportPage() {
  const t = useTranslations('support');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { unreadCounts, unreadTotal, markConversationRead } = useSupportNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>('waiting');
  const [loading, setLoading] = useState(true);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [incomingCallSignal, setIncomingCallSignal] = useState<SupportCallSignalEvent | null>(null);
  const [pinnedConversation, setPinnedConversation] = useState<Conversation | null>(null);

  const activeId = searchParams.get('conversation');

  const setActiveId = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('conversation', id);
    } else {
      params.delete('conversation');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const load = useCallback(async () => {
    try {
      const data = await fetchConversations(statusFilter);
      setConversations((prev) => {
        const next = data.conversations;
        if (!activeId) return next;
        const kept = prev.find((c) => c._id === activeId);
        if (kept && !next.some((c) => c._id === activeId)) {
          return [kept, ...next];
        }
        return next;
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activeId]);

  useEffect(() => {
    if (!activeId) return;
    if (conversations.some((c) => c._id === activeId)) return;

    void fetchConversation(activeId)
      .then((conversation) => {
        setConversations((prev) => {
          if (prev.some((c) => c._id === conversation._id)) return prev;
          return [conversation, ...prev];
        });
      })
      .catch(() => { });
  }, [activeId, conversations]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setIncomingCallSignal(null);
      return;
    }

    setTypingUserId(null);
    markConversationRead(activeId);

    const storedPending = peekAcceptedOffer(activeId);
    if (storedPending) {
      setIncomingCallSignal(storedPending);
      publishCallSignal(storedPending);
      setStatusFilter(undefined);
    } else {
      setIncomingCallSignal(null);
    }

    fetchMessages(activeId)
      .then((data) => setMessages(data.messages))
      .catch(() => { });
  }, [activeId, markConversationRead]);

  useEffect(() => {
    const onAccepted = (event: Event) => {
      const detail = (event as CustomEvent<SupportCallSignalEvent & { callAccepted?: boolean }>).detail;
      if (!detail) return;

      if (detail.conversationId !== activeId) {
        setActiveId(detail.conversationId);
        if (detail.type === 'offer' && detail.callAccepted) {
          asAcceptedCall(detail);
        }
        setStatusFilter(undefined);
        return;
      }

      if (detail.type === 'offer' && detail.callAccepted) {
        const accepted = asAcceptedCall(detail);
        setIncomingCallSignal(accepted);
        publishCallSignal(accepted);
        setStatusFilter(undefined);
      }
    };
    const onEnded = (event: Event) => {
      const detail = (event as CustomEvent<SupportCallSignalEvent>).detail;
      clearCallAcceptIntent();
      if (detail?.conversationId === activeId) {
        setIncomingCallSignal({
          ...detail,
          type: 'state',
          payload: { state: 'ended' },
        });
      }
    };
    window.addEventListener('support:call-accepted', onAccepted);
    window.addEventListener('support:call-ended', onEnded);
    return () => {
      window.removeEventListener('support:call-accepted', onAccepted);
      window.removeEventListener('support:call-ended', onEnded);
    };
  }, [activeId, setActiveId]);

  const handleMessage = useCallback((payload: SupportMessageEvent) => {
    if (payload.senderId === user?.id) return;
    if (payload.conversationId === activeId) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === payload.messageId)) return prev;
        return [...prev, {
          _id: payload.messageId,
          conversationId: payload.conversationId,
          senderId: payload.senderId,
          senderRole: payload.senderRole,
          content: payload.content,
          type: 'text',
          createdAt: payload.sentAt,
        }];
      });
    }
    load();
  }, [activeId, load, user?.id]);

  const handlePresence = useCallback((payload: SupportPresenceEvent) => {
    if (payload.conversationId && payload.status) {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === payload.conversationId
            ? { ...c, status: payload.status as ConversationStatus, assignedTo: payload.assignedTo ?? c.assignedTo }
            : c,
        ),
      );
    }
    load();
  }, [load]);

  const handleTyping = useCallback((payload: SupportTypingEvent) => {
    if (payload.conversationId === activeId) {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    }
  }, [activeId]);

  const handleCallSignal = useCallback((payload: SupportCallSignalEvent) => {
    if (payload.senderId === user?.id) return;

    if (isEndedSignal(payload)) {
      clearCallAcceptIntent();
      publishCallSignal(payload);
      if (payload.conversationId === activeId) {
        setIncomingCallSignal(payload);
      }
      return;
    }

    if (isIncomingCallSignal(payload)) {
      if (payload.type === 'offer') {
        const accepted = consumeAcceptedOffer(payload);
        if (accepted) {
          publishCallSignal(accepted);
          if (payload.conversationId === activeId) {
            setIncomingCallSignal(accepted);
          }
        }
      }
      return;
    }

    publishCallSignal(payload);
  }, [activeId, user?.id]);

  useConversationStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
    onNewConversation: load,
    onCallSignal: handleCallSignal,
  });

  const handleSelect = async (id: string) => {
    markConversationRead(id);
    setActiveId(id);
  };

  const handleAccept = async () => {
    if (!activeId) return;
    try {
      await acceptConversation(activeId);
      load();
    } catch {
    }
  };

  const handleClose = async () => {
    if (!activeId) return;
    try {
      await closeConversation(activeId);
      setActiveId(null);
      load();
    } catch {
    }
  };

  const activeConv = conversations.find((c) => c._id === activeId)
    ?? (pinnedConversation?._id === activeId ? pinnedConversation : null);

  useEffect(() => {
    if (activeConv) {
      setPinnedConversation((prev) => (prev?._id === activeConv._id ? prev : activeConv));
    } else if (!activeId) {
      setPinnedConversation(null);
    }
  }, [activeConv, activeId]);

  if (loading && !activeId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (activeId && !activeConv) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className={`${activeId ? 'hidden lg:flex' : 'flex'} min-h-0 w-full shrink-0 flex-col lg:w-80`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-3">
          <h1 className="text-sm font-semibold text-text-primary">{t('waitingQueue')}</h1>
          <SupportBadge count={unreadTotal} />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            unreadCounts={unreadCounts}
            onSelect={handleSelect}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
          />
        </div>
      </div>

      <div className={`min-h-0 flex-1 ${activeId ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
        {activeConv ? (
          <ConversationThread
            key={activeConv._id}
            conversationId={activeConv._id}
            messages={messages}
            onNewMessage={(msg) => setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg])}
            typingUserId={typingUserId}
            onBack={() => setActiveId(null)}
            onClose={handleClose}
            onAccept={handleAccept}
            status={activeConv.status}
            canAccept={activeConv.status === 'waiting'}
            incomingCallSignal={incomingCallSignal}
            onCallSignal={(signal) => {
              void sendCallSignal(activeConv._id, signal.type, signal.payload, signal.sessionId);
            }}
          />
        ) : (
          <div className="hidden h-full items-center justify-center lg:flex">
            <p className="text-sm text-text-secondary">{t('selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
