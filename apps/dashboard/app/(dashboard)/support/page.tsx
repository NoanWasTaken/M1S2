'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { ConversationList, type KindFilter } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { NewConversationDialog } from '@/components/support/new-conversation-dialog';
import { SupportBadge } from '@/components/support/support-badge';
import { fetchConversations, fetchMessages, closeConversation, getUnreadCount, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';

export default function SupportPage() {
  const t = useTranslations('support');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Member: internal only
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
    if (activeId) {
      setTypingUserId(null);
      setUnreadCounts((prev) => ({ ...prev, [activeId]: 0 }));
      fetchMessages(activeId)
        .then((data) => setMessages(data.messages))
        .catch(() => { });
    } else {
      setMessages([]);
    }
  }, [activeId]);

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

  useConversationStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
  }, activeId || undefined);

  const handleSelect = async (id: string) => {
    setActiveId(id);
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
              conversationId={activeConv._id}
              messages={messages}
              onNewMessage={(msg) => setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg])}
              typingUserId={typingUserId}
              onBack={() => setActiveId(null)}
              onClose={isMember ? undefined : handleClose}
              status={activeConv.status}
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