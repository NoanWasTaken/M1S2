'use client';

import { useTranslations } from 'next-intl';
import type { SupportCallSignalEvent } from '@/lib/use-conversation-stream';

type Props = {
    open: boolean;
    call: SupportCallSignalEvent | null;
    onAnswer: () => void;
    onDecline: () => void;
};

export function IncomingCallPopup({ open, call, onAnswer, onDecline }: Props) {
    const t = useTranslations('support');

    if (!open || !call) return null;

    const text = call.senderRole === 'admin'
      ? t('callIncomingPopupTextFromAdmin')
      : t('callIncomingPopupTextFromOwner');

    return (
        <div className="fixed bottom-4 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-accent/40 bg-[rgba(13,18,32,0.96)] p-4 shadow-[0_22px_70px_rgba(2,8,23,0.55)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M5.75 7.75a2.75 2.75 0 0 1 2.75-2.75h1.5a2.75 2.75 0 0 1 2.75 2.75v.5a2.75 2.75 0 0 1-.82 1.93l-.75.75a10.25 10.25 0 0 0 4.07 4.07l.75-.75a2.75 2.75 0 0 1 1.93-.82h.5a2.75 2.75 0 0 1 2.75 2.75v1.5a2.75 2.75 0 0 1-2.75 2.75h-.2c-7.3 0-13.3-6-13.3-13.3V3.75A2.75 2.75 0 0 1 3.75 1h1.5a2.75 2.75 0 0 1 2.75 2.75v.5Z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.5 6.5c2.5.6 4.4 2.5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.5 3.5c4.3.8 7.7 4.2 8.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{t('callIncomingPopupTitle')}</p>
                    <p className="mt-1 text-sm leading-5 text-text-secondary">{text}</p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onAnswer}
                    className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-[#05070d] transition hover:opacity-90"
                >
                    {t('callIncomingPopupAnswer')}
                </button>
                <button
                    type="button"
                    onClick={onDecline}
                    className="rounded-lg border border-border-subtle bg-bg-card/80 px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary"
                >
                    {t('callIncomingPopupDecline')}
                </button>
            </div>
        </div>
    );
}
