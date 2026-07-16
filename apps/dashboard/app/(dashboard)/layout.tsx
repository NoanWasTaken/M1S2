import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApplicationProvider } from '@/providers/application-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { PageEnter } from '@/components/ui/page-enter';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ApplicationProvider>
        <div className="flex h-dvh overflow-hidden bg-(--bg-page)">
          <Sidebar />
          <main className="flex min-h-0 flex-1 flex-col overflow-auto pt-14 lg:pt-0">
            <ImpersonationBanner />
            <PageEnter>{children}</PageEnter>
          </main>
        </div>
      </ApplicationProvider>
    </ProtectedRoute>
  );
}