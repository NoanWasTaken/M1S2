'use client';

import { useTranslations } from 'next-intl';
import type { Conversation, ConversationStatus } from '@/lib/support-api';

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  unreadCounts: Record<string, number>;
  onSelect: (id: string) => void;
  statusFilter: ConversationStatus | undefined;
  onStatusFilter: (status: ConversationStatus | undefined) => void;
};

const statusLabels: (ConversationStatus | undefined)[] = [undefined, 'waiting', 'open', 'closed'];

export function ConversationList({ conversations, activeId, unreadCounts, onSelect, statusFilter, onStatusFilter }: Props) {
  const t = useTranslations('support');

  return (
    <div className="flex h-full flex-col border-r border-border-subtle">
      <div className="flex gap-1 border-b border-border-subtle px-3 py-2">
        {statusLabels.map((s) => (
          <button
            key={s ?? 'all'}
            type="button"
            onClick={() => onStatusFilter(s)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-bg-active text-accent'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            {s ? t(s) : t('all')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">{t('noConversations')}</p>
        )}

        {conversations.map((conv) => {
          const isActive = conv._id === activeId;
          const unread = unreadCounts[conv._id] ?? 0;

          return (
            <button
              key={conv._id}
              type="button"
              onClick={() => onSelect(conv._id)}
              className={`w-full border-b border-border-subtle px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-bg-active'
                  : 'hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-text-primary truncate">{conv.subject}</span>
                {unread > 0 && (
                  <span className="shrink-0 rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-5 text-white">
                    {unread}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  conv.status === 'waiting' ? 'bg-warning' :
                  conv.status === 'open' ? 'bg-success' : 'bg-text-tertiary'
                }`} />
                <span className="text-xs text-text-secondary">{t(conv.status)}</span>
                <span className="text-xs text-text-tertiary">{timeAgo(conv.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}
