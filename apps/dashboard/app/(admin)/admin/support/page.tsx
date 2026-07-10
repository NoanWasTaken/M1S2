'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { fetchConversations, fetchMessages, acceptConversation, closeConversation, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';

export default function AdminSupportPage() {
  const t = useTranslations('support');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>('waiting');
  const [unreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const typingUserId = useRef<string | null>(null);

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

  const handleMessage = useCallback((payload: SupportMessageEvent) => {
    if (payload.conversationId === activeId) {
      setMessages((prev) => [...prev, {
        _id: payload.messageId,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        senderRole: payload.senderRole,
        content: payload.content,
        type: 'text',
        createdAt: payload.sentAt,
      }]);
    }
    load();
  }, [activeId, load]);

  const handlePresence = useCallback((_payload: SupportPresenceEvent) => {
    load();
  }, [load]);

  const handleTyping = useCallback((payload: SupportTypingEvent) => {
    if (payload.conversationId === activeId) {
      typingUserId.current = payload.isTyping ? payload.userId : null;
    }
  }, [activeId]);

  useConversationStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
  });

  const handleSelect = async (id: string) => {
    setActiveId(id);
    setMessages([]);
    try {
      const data = await fetchMessages(id);
      setMessages(data.messages);
    } catch {
    }
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
            onNewMessage={(msg) => setMessages((prev) => [...prev, msg])}
            typingUserId={typingUserId.current}
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
