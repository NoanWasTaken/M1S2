'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createConversation } from '@/lib/support-api';

type Props = {
  onCreated: () => void;
  onCancel: () => void;
};

export function NewConversationDialog({ onCreated, onCancel }: Props) {
  const t = useTranslations('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await createConversation(subject.trim(), message.trim());
      onCreated();
    } catch {
      setError(t('errorSending'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border-card bg-bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('newConversation')}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-secondary">
              {t('subject')}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-page px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder={t('subjectPlaceholder')}
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-secondary">
              {t('message')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-page px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder={t('messagePlaceholder')}
              maxLength={5000}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!subject.trim() || !message.trim() || sending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#05070d] transition-opacity disabled:opacity-40"
            >
              {sending ? '...' : t('send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
