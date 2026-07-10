'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConversationList } from '@/components/support/conversation-list';
import { ConversationThread } from '@/components/support/conversation-thread';
import { NewConversationDialog } from '@/components/support/new-conversation-dialog';
import { SupportBadge } from '@/components/support/support-badge';
import { fetchConversations, fetchMessages, closeConversation, getUnreadCount, type Conversation, type ConversationStatus, type Message } from '@/lib/support-api';
import { useConversationStream, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '@/lib/use-conversation-stream';

export default function SupportPage() {
  const t = useTranslations('support');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>(undefined);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [showNew, setShowNew] = useState(false);
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

  useEffect(() => {
    getUnreadCount().then(setUnreadTotal).catch(() => {});
  }, [conversations]);

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
    setUnreadCounts((prev) => ({
      ...prev,
      [payload.conversationId]: (prev[payload.conversationId] ?? 0) + 1,
    }));
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
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
    try {
      const data = await fetchMessages(id);
      setMessages(data.messages);
    } catch {
    }
  };

  const handleClose = async () => {
    if (!activeId) return;
    try {
      await closeConversation(activeId);
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
    <>
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex w-80 shrink-0 flex-col">
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
              {t('newConversation')}
            </button>
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
              status={activeConv.status}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-secondary">{t('selectConversation')}</p>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewConversationDialog
          onCreated={() => { setShowNew(false); load(); }}
          onCancel={() => setShowNew(false)}
        />
      )}
    </>
  );
}
