import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApplicationProvider } from '@/providers/application-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { PageEnter } from '@/components/ui/page-enter';
import { GlobalIncomingCallLayer } from '@/components/support/global-incoming-call-layer';
import { SupportNotificationsProvider } from '@/components/support/support-notifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ApplicationProvider>
        <SupportNotificationsProvider>
          <div className="flex h-dvh overflow-hidden bg-(--bg-page)">
            <Sidebar />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
              <ImpersonationBanner />
              <GlobalIncomingCallLayer />
              <PageEnter className="min-h-0 overflow-auto">{children}</PageEnter>
            </main>
          </div>
        </SupportNotificationsProvider>
      </ApplicationProvider>
    </ProtectedRoute>
  );
}