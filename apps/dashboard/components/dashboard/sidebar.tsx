'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { useApplications } from '@/providers/application-provider';

type NavItem = { href: string; key: string; icon: string };

function navItems(role: string | undefined, isMember: boolean): NavItem[] {
  if (role === 'admin') {
    return [
      { href: '/admin/companies', key: 'companies', icon: 'pages' },
      { href: '/admin/users', key: 'users', icon: 'events' },
      { href: '/admin/stats', key: 'stats', icon: 'overview' },
      { href: '/admin/support', key: 'support', icon: 'support' },
    ];
  }

  const items: NavItem[] = [
    { href: '/dashboard', key: 'overview', icon: 'overview' },
    { href: '/pages', key: 'pages', icon: 'pages' },
    { href: '/events', key: 'events', icon: 'events' },
    { href: '/tracking/tags', key: 'tags', icon: 'tags' },
    { href: '/tracking/funnels', key: 'funnels', icon: 'funnels' },
    { href: '/support', key: 'support', icon: 'support' },
  ];

  if (!isMember) {
    items.push({ href: '/team', key: 'team', icon: 'team' });
  }

  items.push({ href: '/settings', key: 'settings', icon: 'settings' });
  return items;
}

const iconMap: Record<string, React.ReactNode> = {
  overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  pages: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  events: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  tags: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l0 0 10 10 4-4-10-10-4 4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5L19.5 13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h0a1 1 0 011-1h0a1 1 0 011 1v0a1 1 0 01-1 1h0a1 1 0 01-1-1z" />
    </svg>
  ),
  funnels: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16l-6 7v5l-4 3V11L4 4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h6" />
    </svg>
  ),
  support: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  team: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

function SiteSelector() {
  const t = useTranslations('nav');
  const { applications, selectedApp, setSelectedAppId } = useApplications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border-subtle bg-bg-card px-3.5 py-2.5 text-sm text-text-primary"
      >
        <span className="truncate">{selectedApp?.name ?? t('noSite')}</span>
        <svg className="h-4 w-4 shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-border-subtle bg-bg-card p-1 shadow-lg">
            {applications.length === 0 ? (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                {t('noAppCreate')}
              </Link>
            ) : (
              applications.map((app) => (
                <button
                  key={app._id}
                  type="button"
                  onClick={() => {
                    setSelectedAppId(app.appId);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${selectedApp?.appId === app.appId
                    ? 'bg-bg-active text-accent'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                >
                  <span className="truncate">{app.name}</span>
                  {selectedApp?.appId === app.appId && (
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'webmaster' && user?.teamRole === 'member';

  return (
    <>
      <div className="flex flex-col gap-6 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <svg className="h-4 w-4 text-[#05070d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-base font-bold text-text-primary">{tCommon('appName')}</span>
        </div>

        {!isAdmin && <SiteSelector />}

        <nav className="flex flex-col gap-1">
          {navItems(user?.role, isMember).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive
                  ? 'bg-bg-active text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
              >
                {iconMap[item.icon]}
                <span className="font-medium">{tNav(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle p-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-sm text-text-secondary">{tNav('liveActive')}</span>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-danger"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">{tNav('logout')}</span>
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-[var(--bg-sidebar)] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-primary transition-colors hover:bg-bg-hover"
          aria-label={tCommon('menu')}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-bold text-text-primary">{tCommon('appName')}</span>
      </header>

      {open && (
        <button
          type="button"
          aria-label={tCommon('close')}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border-subtle bg-[var(--bg-sidebar)] transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-end border-b border-border-subtle p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label={tCommon('close')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}