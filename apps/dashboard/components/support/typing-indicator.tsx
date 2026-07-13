'use client';

import { useTranslations } from 'next-intl';

type Props = {
  visible: boolean;
};

export function TypingIndicator({ visible }: Props) {
  const t = useTranslations('support');

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-text-secondary">
      <span className="text-text-tertiary">{t('typing')}</span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-tertiary [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-tertiary [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-tertiary [animation-delay:300ms]" />
      </span>
    </div>
  );
}
