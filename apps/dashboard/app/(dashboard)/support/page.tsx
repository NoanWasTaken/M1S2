'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { ConversationList, type KindFilter } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { NewConversationDialog } from '@/components/support/new-conversation-dialog';
import { SupportBadge } from '@/components/support/support-badge';
import { useSupportNotifications } from '@/components/support/support-notifications';
import {
  fetchConversations,
  fetchConversation,
  fetchMessages,
  acceptConversation,
  closeConversation,
  sendCallSignal,
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

export default function SupportPage() {
  const t = useTranslations('support');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCounts, unreadTotal, markConversationRead } = useSupportNotifications();

  const isMember = user?.role === 'webmaster' && user?.teamRole === 'member';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>(undefined);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showNew, setShowNew] = useState(false);
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
    load();
  }, [load]);

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
          const accepted = asAcceptedCall(detail);
          setIncomingCallSignal(accepted);
          publishCallSignal(accepted);
        }
        return;
      }

      if (detail.type === 'offer' && detail.callAccepted) {
        const accepted = asAcceptedCall(detail);
        setIncomingCallSignal(accepted);
        publishCallSignal(accepted);
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
    if (payload.userId === user?.id) return;
    if (payload.conversationId === activeId) {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    }
  }, [activeId, user?.id]);

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

  const visibleConversations = useMemo(() => {
    if (kindFilter === 'all') return conversations;
    return conversations.filter((c) => (c.kind ?? 'support') === kindFilter);
  }, [conversations, kindFilter]);

  const activeConv = conversations.find((c) => c._id === activeId)
    ?? (pinnedConversation?._id === activeId ? pinnedConversation : null);

  useEffect(() => {
    if (activeConv) {
      setPinnedConversation((prev) => (prev?._id === activeConv._id ? prev : activeConv));
    } else if (!activeId) {
      setPinnedConversation(null);
    }
  }, [activeConv, activeId]);

  const isRequester = Boolean(activeConv && user?.id && activeConv.userId === user.id);
  const canAcceptConv = Boolean(
    !isMember && !isRequester && activeConv?.status === 'waiting',
  );

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
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className={`${activeId ? 'hidden lg:flex' : 'flex'} min-h-0 w-full shrink-0 flex-col lg:w-80`}>
          <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
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
          <div className="min-h-0 flex-1 overflow-hidden">
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
