'use client';

import { useCallback, useEffect, useState, startTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { fetchConversations, fetchMessages, acceptConversation, closeConversation, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportCallSignalEvent, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';

export default function AdminSupportPage() {
  const t = useTranslations('support');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>('waiting');
  const [unreadCounts] = useState<Record<string, number>>({});
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

  useEffect(() => {
    let cancelled = false;
    fetchConversations(statusFilter)
      .then((data) => { if (!cancelled) setConversations(data.conversations); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter]);

  const reload = useCallback(async () => {
    try {
      const data = await fetchConversations(statusFilter);
      setConversations(data.conversations);
    } catch {
    }
  }, [statusFilter]);

  useEffect(() => {
    startTransition(() => {
      if (activeId) {
        const pending = pendingCalls[activeId];
        setIncomingCallSignal(pending ?? null);
        setTypingUserId(null);
      } else {
        setMessages([]);
      }
    });
    if (activeId) {
      fetchMessages(activeId)
        .then((data) => setMessages(data.messages))
        .catch(() => { });
    }
  }, [activeId, pendingCalls]);

  const handleMessage = useCallback((payload: SupportMessageEvent) => {
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
    reload();
  }, [activeId, reload]);

  const handlePresence = useCallback((_payload: SupportPresenceEvent) => {
    reload();
  }, [reload]);

  const handleTyping = useCallback((payload: SupportTypingEvent) => {
    if (payload.conversationId === activeId) {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    }
  }, [activeId]);

  const handleCallSignal = useCallback((payload: SupportCallSignalEvent) => {
    const isRinging = payload.type === 'state' && typeof payload.payload === 'object' && payload.payload !== null && 'state' in payload.payload && payload.payload.state === 'ringing';
    const isIncomingCall = payload.type === 'offer' || isRinging;

    if (isIncomingCall) {
      setPendingCalls((prev) => ({ ...prev, [payload.conversationId]: payload }));
    }

    if (payload.type === 'state' && typeof payload.payload === 'object' && payload.payload !== null && 'state' in payload.payload && payload.payload.state === 'ended') {
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
    onNewConversation: reload,
    onCallSignal: handleCallSignal,
  }, activeId || undefined);

  const handleSelect = async (id: string) => {
    setActiveId(id);
  };

  const handleAccept = async () => {
    if (!activeId) return;
    try {
      await acceptConversation(activeId);
      reload();
    } catch {
    }
  };

  const handleClose = async () => {
    if (!activeId) return;
    try {
      await closeConversation(activeId);
      setActiveId(null);
      reload();
    } catch {
    }
  };

  const activeConv = conversations.find((c) => c._id === activeId);
  const pendingCall = Object.values(pendingCalls)[0] ?? null;

  const handleAnswerPendingCall = async () => {
    if (!pendingCall) return;
    const id = pendingCall.conversationId;

    // The conversation might not be in the currently filtered list
    // (e.g. it isn't in "waiting" status). Load it before switching to it,
    // otherwise activeConv stays undefined and ConversationThread never mounts.
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
    void import('@/lib/support-api').then(({ sendCallSignal }) => sendCallSignal(pendingCall.conversationId, 'state', { state: 'ended' }));
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
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100vh-4rem)] lg:flex-row">
      {pendingCall && pendingCall.conversationId !== activeId && (
        <div className="border-b border-accent/30 bg-accent/10 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Incoming call</p>
              <p className="text-xs text-text-secondary">Support wants to start a video call with you.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleAnswerPendingCall} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#05070d]">
                Answer
              </button>
              <button type="button" onClick={handleDeclinePendingCall} className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`${activeId ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col lg:w-80`}>
        <div className="border-b border-border-subtle px-4 py-3">
          <h1 className="text-sm font-semibold text-text-primary">{t('waitingQueue')}</h1>
        </div>
        <div className="flex-1 overflow-hidden">
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
              void import('@/lib/support-api').then(({ sendCallSignal }) => sendCallSignal(activeConv._id, signal.type, signal.payload, signal.sessionId));
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
