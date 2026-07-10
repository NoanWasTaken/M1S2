'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { fetchConversations, fetchMessages, acceptConversation, closeConversation, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';

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
      fetchMessages(activeId)
        .then((data) => setMessages(data.messages))
        .catch(() => {});
    } else {
      setMessages([]);
    }
  }, [activeId]);

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
    load();
  }, [activeId, load]);

  const handlePresence = useCallback((_payload: SupportPresenceEvent) => {
    load();
  }, [load]);

  const handleTyping = useCallback((payload: SupportTypingEvent) => {
    if (payload.conversationId === activeId) {
      setTypingUserId(payload.isTyping ? payload.userId : null);
    }
  }, [activeId]);

  useConversationStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
    onNewConversation: load,
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

  const activeConv = conversations.find((c) => c._id === activeId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex w-80 shrink-0 flex-col">
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

      <div className="flex-1">
        {activeConv ? (
          <ConversationThread
            conversationId={activeConv._id}
            messages={messages}
            onNewMessage={(msg) => setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg])}
            typingUserId={typingUserId}
            onClose={handleClose}
            onAccept={handleAccept}
            status={activeConv.status}
            canAccept={activeConv.status === 'waiting'}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-secondary">{t('selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
