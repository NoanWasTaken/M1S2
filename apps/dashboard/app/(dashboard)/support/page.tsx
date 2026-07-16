'use client';

import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { ConversationList, type KindFilter } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { NewConversationDialog } from '@/components/support/new-conversation-dialog';
import { SupportBadge } from '@/components/support/support-badge';
import {
  fetchConversations,
  fetchMessages,
  acceptConversation,
  closeConversation,
  getUnreadCount,
  type Conversation,
  type ConversationStatus,
  type Message,
} from '@/lib/support-api';
import {
  useConversationStream,
  type SupportCallSignalEvent,
  type SupportMessageEvent,
  type SupportPresenceEvent,
  type SupportTypingEvent,
} from '@/lib/use-conversation-stream';

export default function SupportPage() {
  const t = useTranslations('support');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const isMember = user?.role === 'webmaster' && user?.teamRole === 'member';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>(undefined);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [incomingCallSignal, setIncomingCallSignal] = useState<SupportCallSignalEvent | null>(null);
  const [pendingCalls, setPendingCalls] = useState<Record<string, SupportCallSignalEvent>>({});

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
      setConversations(data.conversations);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const storedPending = typeof window !== 'undefined'
      ? (() => {
        try {
          const raw = window.sessionStorage.getItem('support:pending-call');
          return raw ? JSON.parse(raw) as SupportCallSignalEvent : null;
        } catch {
          return null;
        }
      })()
      : null;

    const pending = activeId && storedPending?.conversationId === activeId
      ? storedPending
      : activeId
        ? pendingCalls[activeId] ?? null
        : null;

    startTransition(() => {
      if (activeId) {
        setIncomingCallSignal(pending ?? null);
        setTypingUserId(null);
        setUnreadCounts((prev) => ({ ...prev, [activeId]: 0 }));
      } else {
        setMessages([]);
      }
    });

    if (activeId && storedPending?.conversationId === activeId) {
      window.sessionStorage.removeItem('support:pending-call');
    }

    if (activeId) {
      fetchMessages(activeId)
        .then((data) => setMessages(data.messages))
        .catch(() => { });
    }
  }, [activeId, pendingCalls]);

  useEffect(() => {
    getUnreadCount().then(setUnreadTotal).catch(() => { });
  }, [conversations]);

  const handleMessage = useCallback((payload: SupportMessageEvent) => {
    if (payload.senderId === user?.id) return;

    const isActive = payload.conversationId === activeId;

    if (isActive) {
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
    } else {
      setUnreadCounts((prev) => ({
        ...prev,
        [payload.conversationId]: (prev[payload.conversationId] ?? 0) + 1,
      }));
    }

    load();
  }, [activeId, load, user?.id]);

  const handlePresence = useCallback((_payload: SupportPresenceEvent) => {
    load();
  }, [load]);

  const handleTyping = useCallback((payload: SupportTypingEvent) => {
    if (payload.userId === user?.id) return;
    if (payload.conversationId === activeId) {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    }
  }, [activeId, user?.id]);

  const handleCallSignal = useCallback((payload: SupportCallSignalEvent) => {
    const isRinging = payload.type === 'state'
      && typeof payload.payload === 'object'
      && payload.payload !== null
      && 'state' in payload.payload
      && payload.payload.state === 'ringing';
    const isIncomingCall = payload.type === 'offer' || isRinging;

    if (isIncomingCall) {
      setPendingCalls((prev) => ({ ...prev, [payload.conversationId]: payload }));
    }

    const isEnded = payload.type === 'state'
      && typeof payload.payload === 'object'
      && payload.payload !== null
      && 'state' in payload.payload
      && payload.payload.state === 'ended';

    if (isEnded) {
      setPendingCalls((prev) => {
        const next = { ...prev };
        delete next[payload.conversationId];
        return next;
      });
      if (payload.conversationId === activeId) {
        setIncomingCallSignal(null);
      }
      return;
    }

    if (payload.conversationId === activeId) {
      setIncomingCallSignal(payload);
    }
  }, [activeId]);

  useConversationStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
    onNewConversation: load,
    onCallSignal: handleCallSignal,
  }, activeId || undefined);

  const handleSelect = async (id: string) => {
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

  const visibleConversations = useMemo(() => {
    if (kindFilter === 'all') return conversations;
    return conversations.filter((c) => (c.kind ?? 'support') === kindFilter);
  }, [conversations, kindFilter]);

  const activeConv = conversations.find((c) => c._id === activeId);
  const pendingCall = Object.values(pendingCalls)[0] ?? null;

  const isRequester = Boolean(activeConv && user?.id && activeConv.userId === user.id);
  const canAcceptConv = Boolean(
    !isMember && !isRequester && activeConv?.status === 'waiting',
  );

  const handleAnswerPendingCall = async () => {
    if (!pendingCall) return;
    const id = pendingCall.conversationId;

    if (!conversations.some((c) => c._id === id)) {
      try {
        const data = await fetchConversations(undefined);
        setConversations(data.conversations);
      } catch {
      }
    }

    setActiveId(id);
    setIncomingCallSignal(pendingCall);
  };

  const handleDeclinePendingCall = () => {
    if (!pendingCall) return;
    void import('@/lib/support-api').then(({ sendCallSignal }) =>
      sendCallSignal(pendingCall.conversationId, 'state', { state: 'ended' }),
    );
    setPendingCalls((prev) => {
      const next = { ...prev };
      delete next[pendingCall.conversationId];
      return next;
    });
    if (activeId === pendingCall.conversationId) {
      setIncomingCallSignal(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100vh-4rem)] lg:flex-row">
        <div className={`${activeId ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col lg:w-80`}>
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-text-primary">{t('title')}</h1>
              <SupportBadge count={unreadTotal} />
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#05070d] transition-opacity hover:opacity-90"
            >
              {isMember ? t('askOwner') : t('newConversation')}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={visibleConversations}
              activeId={activeId}
              unreadCounts={unreadCounts}
              onSelect={handleSelect}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
              kindFilter={kindFilter}
              onKindFilter={setKindFilter}
              showKindTabs={!isMember}
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
              onClose={isMember ? undefined : handleClose}
              onAccept={canAcceptConv ? handleAccept : undefined}
              status={activeConv.status}
              canAccept={canAcceptConv}
              incomingCallSignal={incomingCallSignal}
              onCallSignal={(signal) => {
                void import('@/lib/support-api').then(({ sendCallSignal }) =>
                  sendCallSignal(activeConv._id, signal.type, signal.payload, signal.sessionId),
                );
              }}
            />
          ) : (
            <div className="hidden h-full items-center justify-center lg:flex">
              <p className="text-sm text-text-secondary">{t('selectConversation')}</p>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewConversationDialog
          internal={isMember}
          onCreated={() => { setShowNew(false); load(); }}
          onCancel={() => setShowNew(false)}
        />
      )}
    </>
  );
}