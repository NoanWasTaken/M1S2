import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApplicationProvider } from '@/providers/application-provider';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ApplicationProvider>
        <div className="flex min-h-dvh bg-(--bg-page)">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-auto">{children}</main>
        </div>
      </ApplicationProvider>
    </ProtectedRoute>
  );
}