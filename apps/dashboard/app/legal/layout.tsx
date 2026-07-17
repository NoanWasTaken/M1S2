import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('cgu');
  const tCommon = await getTranslations('common');
  const tAuth = await getTranslations('auth.register');

  return (
    <div className="min-h-dvh bg-(--bg-page)">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-(--bg-sidebar)/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <svg className="h-4 w-4 text-[#05070d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-bold text-text-primary">{tCommon('appName')}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              {tAuth('login')}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-[#05070d] transition-opacity hover:opacity-90"
            >
              {t('backToRegister')}
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
