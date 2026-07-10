import { ProtectedRoute } from '@/components/auth/protected-route';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-bg-page">
        <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 text-xs font-medium text-accent">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Mode administration
        </div>
        {children}
      </div>
    </ProtectedRoute>
  );
}
