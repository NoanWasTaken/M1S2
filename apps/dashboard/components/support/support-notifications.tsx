'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import {
  useConversationStream,
  type SupportMessageEvent,
  type SupportNewConversationEvent,
} from '@/lib/use-conversation-stream';
import { SupportBadge } from '@/components/support/support-badge';

type ToastItem = {
  id: string;
  conversationId: string;
  content: string;
  senderRole: 'webmaster' | 'admin';
};

type SupportNotificationsContextValue = {
  unreadCounts: Record<string, number>;
  unreadTotal: number;
  markConversationRead: (conversationId: string) => void;
};

const SupportNotificationsContext = createContext<SupportNotificationsContextValue | null>(null);

function MessageToastStack({
  toasts,
  onClose,
  onOpen,
}: {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  onOpen: (conversationId: string) => void;
}) {
  const t = useTranslations('support');

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-[slideInRight_0.25s_ease-out] rounded-xl border border-border-subtle bg-[rgba(13,18,32,0.96)] p-3 shadow-[0_18px_50px_rgba(2,8,23,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary">{t('messageToastTitle')}</p>
              <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{toast.content}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(toast.conversationId)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {t('messageToastOpen')}
                </button>
                <button
                  type="button"
                  onClick={() => onClose(toast.id)}
                  className="text-xs text-text-tertiary hover:text-text-secondary"
                >
                  {t('messageToastDismiss')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupportNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const activeConversationId = useMemo(() => {
    if (!pathname.includes('/support')) return null;
    return searchParams.get('conversation');
  }, [pathname, searchParams]);

  const markConversationRead = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setToasts((prev) => prev.filter((t) => t.conversationId !== conversationId));
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      markConversationRead(activeConversationId);
    }
  }, [activeConversationId, markConversationRead]);

  const handleMessage = useCallback(
    (payload: SupportMessageEvent) => {
      if (!user?.id || payload.senderId === user.id) return;
      if (payload.type === 'system') return;

      const isViewing = payload.conversationId === activeConversationId;
      if (isViewing) return;

      setUnreadCounts((prev) => ({
        ...prev,
        [payload.conversationId]: (prev[payload.conversationId] ?? 0) + 1,
      }));

      const id = `${payload.messageId}-${Date.now()}`;
      setToasts((prev) => [
        {
          id,
          conversationId: payload.conversationId,
          content: payload.content,
          senderRole: payload.senderRole,
        },
        ...prev,
      ].slice(0, 3));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    [activeConversationId, user?.id],
  );

  const handleNewConversation = useCallback(
    (payload: SupportNewConversationEvent) => {
      if (payload.conversationId === activeConversationId) return;

      setUnreadCounts((prev) => ({
        ...prev,
        [payload.conversationId]: (prev[payload.conversationId] ?? 0) + 1,
      }));

      const id = `new-${payload.conversationId}-${Date.now()}`;
      setToasts((prev) => [
        {
          id,
          conversationId: payload.conversationId,
          content: payload.subject,
          senderRole: 'webmaster',
        },
        ...prev,
      ].slice(0, 3));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    [activeConversationId],
  );

  useConversationStream({ onMessage: handleMessage, onNewConversation: handleNewConversation });

  const unreadTotal = useMemo(
    () => Object.values(unreadCounts).reduce((sum, n) => sum + n, 0),
    [unreadCounts],
  );

  const openConversation = useCallback(
    (conversationId: string) => {
      markConversationRead(conversationId);
      const base = pathname.startsWith('/admin') ? '/admin/support' : '/support';
      router.push(`${base}?conversation=${conversationId}`);
    },
    [markConversationRead, pathname, router],
  );

  const value = useMemo(
    () => ({ unreadCounts, unreadTotal, markConversationRead }),
    [unreadCounts, unreadTotal, markConversationRead],
  );

  return (
    <SupportNotificationsContext.Provider value={value}>
      {children}
      <MessageToastStack
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onOpen={openConversation}
      />
    </SupportNotificationsContext.Provider>
  );
}

export function useSupportNotifications(): SupportNotificationsContextValue {
  const ctx = useContext(SupportNotificationsContext);
  if (!ctx) {
    return {
      unreadCounts: {},
      unreadTotal: 0,
      markConversationRead: () => { },
    };
  }
  return ctx;
}

export function SupportNavBadge() {
  const { unreadTotal } = useSupportNotifications();
  return <SupportBadge count={unreadTotal} />;
}
