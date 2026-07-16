import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApplicationProvider } from '@/providers/application-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { PageEnter } from '@/components/ui/page-enter';
import { GlobalIncomingCallLayer } from '@/components/support/global-incoming-call-layer';
import { SupportNotificationsProvider } from '@/components/support/support-notifications';
import { getTranslations } from 'next-intl/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute>
      <ApplicationProvider>
        <SupportNotificationsProvider>
          <div className="flex h-dvh overflow-hidden bg-(--bg-page)">
            <Sidebar />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center gap-2 bg-accent/10 px-4 py-2 text-xs font-medium text-accent">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('adminModeBanner')}
              </div>
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
                <GlobalIncomingCallLayer />
                <PageEnter className="min-h-0 overflow-auto">{children}</PageEnter>
              </main>
            </div>
          </div>
        </SupportNotificationsProvider>
      </ApplicationProvider>
    </ProtectedRoute>
  );
}
