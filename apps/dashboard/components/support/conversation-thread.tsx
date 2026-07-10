'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { sendMessage, sendTyping, type Message } from '@/lib/support-api';
import { TypingIndicator } from './typing-indicator';

type Props = {
  conversationId: string;
  messages: Message[];
  onNewMessage: (msg: Message) => void;
  typingUserId: string | null;
  onClose: () => void;
  onAccept?: () => void;
  status: string;
  canAccept?: boolean;
};

export function ConversationThread({ conversationId, messages, onNewMessage, typingUserId, onClose, onAccept, status, canAccept }: Props) {
  const t = useTranslations('support');
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await sendMessage(conversationId, content);
      onNewMessage(msg);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (typingRef.current) clearTimeout(typingRef.current);
    sendTyping(conversationId, true);
    typingRef.current = setTimeout(() => {
      sendTyping(conversationId, false);
    }, 3000);
  };

  const isOwn = (senderId: string) => senderId === user?.id;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">
          {t(status)}
        </span>
        <div className="flex items-center gap-2">
          {canAccept && status === 'waiting' && onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#05070d] transition-opacity hover:opacity-90"
            >
              {t('accept')}
            </button>
          )}
          {status !== 'closed' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              {t('close')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t('noMessages')}</p>
        )}

        {messages.map((msg) => {
          const mine = isOwn(msg.senderId);
          return (
            <div
              key={msg._id}
              className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2 ${
                  msg.type === 'system'
                    ? 'mx-auto w-full max-w-xs bg-bg-sidebar text-center text-xs text-text-tertiary'
                    : mine
                      ? 'bg-accent text-[#05070d]'
                      : 'bg-bg-card text-text-primary'
                }`}
              >
                {msg.type !== 'system' && (
                  <p className="mb-0.5 text-[11px] font-medium opacity-70">
                    {msg.senderRole === 'admin'
                      ? 'Support'
                      : user?.role === 'admin'
                        ? 'Client'
                        : 'Vous'}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-[#05070d]/60' : 'text-text-tertiary'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        <TypingIndicator visible={typingUserId !== null} />
        <div ref={endRef} />
      </div>

      <div className="border-t border-border-subtle px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('typeHere')}
            rows={2}
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-accent text-[#05070d] transition-opacity disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-7-7m7 7l-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
