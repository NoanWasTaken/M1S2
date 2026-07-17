'use client';

import { useTranslations } from 'next-intl';

const SECTION_KEYS = [
  'object',
  'definitions',
  'access',
  'service',
  'accounts',
  'obligationsUser',
  'obligationsProvider',
  'data',
  'sdk',
  'support',
  'ip',
  'availability',
  'liability',
  'suspension',
  'modifications',
  'law',
  'contact',
] as const;

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split('\n\n').map((paragraph, index) => (
        <p key={index} className="text-sm leading-relaxed text-text-secondary">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function TermsOfServiceContent() {
  const t = useTranslations('cgu');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-border-subtle pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">{t('eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary sm:text-3xl">{t('title')}</h1>
        <p className="mt-3 text-sm text-text-secondary">{t('intro')}</p>
        <p className="mt-4 text-xs text-text-tertiary">{t('lastUpdated')}</p>
      </header>

      <nav aria-label={t('tocLabel')} className="mb-10 rounded-xl border border-border-subtle bg-bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">{t('tocLabel')}</p>
        <ol className="columns-1 gap-x-8 space-y-1.5 sm:columns-2">
          {SECTION_KEYS.map((key, index) => (
            <li key={key} className="break-inside-avoid">
              <a
                href={`#cgu-${key}`}
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                {index + 1}. {t(`sections.${key}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {SECTION_KEYS.map((key, index) => (
          <section key={key} id={`cgu-${key}`} className="scroll-mt-20">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">
              <span className="mr-2 text-accent">{index + 1}.</span>
              {t(`sections.${key}.title`)}
            </h2>
            <Paragraphs text={t(`sections.${key}.body`)} />
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-border-subtle pt-6">
        <p className="text-sm text-text-secondary">{t('footer')}</p>
      </footer>
    </div>
  );
}
